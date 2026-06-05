import stripe
from fastapi import APIRouter, Request, HTTPException, status
from typing import Optional
from datetime import datetime
import json
import logging

from app.core.config import settings
from app.db.session import db

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY
endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

logger = logging.getLogger(__name__)

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Robust webhook handler following Stripe strict requirements.
    - Verified using endpoint secret.
    - Processed using raw body parsing.
    - Status tracked synchronously with our DB state.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing signature header")

    if not endpoint_secret:
        # SECURITY: never process unsigned webhooks. The previous fallback parsed the
        # raw body without signature verification, letting anyone forge a
        # checkout.session.completed and grant themselves a paid subscription. Fail closed.
        logger.error("STRIPE_WEBHOOK_SECRET not configured — rejecting unsigned webhook")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook signature verification not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    # Handle the event
    try:
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            await handle_checkout_session(session)

        elif event["type"] in ["customer.subscription.updated", "customer.subscription.deleted"]:
            subscription = event["data"]["object"]
            await handle_subscription_update(subscription)

        elif event["type"] == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            # Can be used to confirm active state or extend time
            pass
            
        elif event["type"] == "invoice.payment_failed":
            invoice = event["data"]["object"]
            # Handle dunning
            await handle_failed_payment(invoice)

        else:
            logger.info(f"Unhandled event type {event['type']}")
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        # We must return 200 even on processing errors so Stripe doesn't repeatedly retry 
        # unless it is a systemic error we want to retry. We'll log it and return 200.
        pass

    return {"status": "success"}

async def handle_checkout_session(session):
    """Link customer to user ID and activate initial subscription"""
    customer_id = session.get("customer")
    client_reference_id = session.get("client_reference_id")
    subscription_id = session.get("subscription")

    if not client_reference_id:
        # Try metadata if client_reference_id missing
        metadata = session.get("metadata", {})
        client_reference_id = metadata.get("user_id")

    if not client_reference_id:
        logger.error("No user_id found in checkout session references")
        return

    try:
        user_id = int(client_reference_id)
        
        # Get subscription details from Stripe
        if subscription_id:
            sub = stripe.Subscription.retrieve(subscription_id)
            status = sub.status
            plan_id = sub.items.data[0].price.id
            current_period_end = datetime.fromtimestamp(sub.current_period_end)
            
            await db.execute('''
                UPDATE users 
                SET stripe_customer_id = $1,
                    subscription_status = $2,
                    subscription_plan = $3,
                    subscription_end_date = $4
                WHERE id = $5
            ''', customer_id, status, plan_id, current_period_end, user_id)
            logger.info(f"User {user_id} subscription initialized successfully")
        else:
            # Just store customer ID for now
            await db.execute('''
                UPDATE users 
                SET stripe_customer_id = $1
                WHERE id = $2
            ''', customer_id, user_id)

    except Exception as e:
        logger.error(f"DB Update failed in checkout_session: {e}")


async def handle_subscription_update(subscription):
    """Synchronize Stripe subscription state with local DB"""
    customer_id = subscription.get("customer")
    status = subscription.get("status")
    plan_id = subscription["items"]["data"][0]["price"]["id"]
    current_period_end = datetime.fromtimestamp(subscription["current_period_end"])

    if not customer_id:
        return

    try:
        await db.execute('''
            UPDATE users 
            SET subscription_status = $1,
                subscription_plan = $2,
                subscription_end_date = $3
            WHERE stripe_customer_id = $4
        ''', status, plan_id, current_period_end, customer_id)
        logger.info(f"Subscription for customer {customer_id} updated to {status}")
    except Exception as e:
        logger.error(f"DB Update failed in subscription_update: {e}")

async def handle_failed_payment(invoice):
    """Handle payment failures for dunning process"""
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")
    
    if not customer_id or not subscription_id:
        return
        
    try:
        # Mark as past_due or incomplete
        sub = stripe.Subscription.retrieve(subscription_id)
        await db.execute('''
            UPDATE users 
            SET subscription_status = $1
            WHERE stripe_customer_id = $2
        ''', sub.status, customer_id)
        logger.info(f"Payment failed for customer {customer_id}, status updated to {sub.status}")
    except Exception as e:
        logger.error(f"DB Update failed in failed_payment: {e}")
