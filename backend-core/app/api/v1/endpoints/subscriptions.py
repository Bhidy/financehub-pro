import stripe
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from typing import Annotated, Optional
import os

from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_active_user
from app.db.session import db

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY

# Ensure we have the environment variables we need
if not stripe.api_key:
    print("WARNING: STRIPE_SECRET_KEY is not set.")

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request,
    current_user: Annotated[dict, Depends(get_current_active_user)]
):
    try:
        data = await request.json()
        price_id = data.get("price_id")
        
        if not price_id:
            raise HTTPException(status_code=400, detail="Price ID is required")

        # Basic idempotency: combine user ID, price ID, and current minute, but Stripe Checkout
        # handles idempotency if we supply `client_reference_id` or just by nature of sessions.
        
        # We need to construct the success and cancel URLs based on the origin
        origin = request.headers.get("origin") or "https://startamarkets.com"
        success_url = f"{origin}/AiChat?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin}/?canceled=true"

        # Check if user already has a Stripe customer ID
        customer_id = current_user.get("stripe_customer_id")
        
        # If the user doesn't have a Stripe customer ID, we can either create one now, 
        # or let Stripe create it during checkout and save it via webhook.
        # We'll let Stripe create it and link via client_reference_id.

        session_params = {
            "payment_method_types": ["card"],
            "line_items": [
                {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            "mode": "subscription",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "allow_promotion_codes": True,
            "client_reference_id": str(current_user["id"]),
            "customer_email": current_user["email"] if not customer_id else None,
            "customer": customer_id if customer_id else None,
            "metadata": {
                "user_id": current_user["id"]
            }
        }
        
        # Remove null values
        session_params = {k: v for k, v in session_params.items() if v is not None}

        checkout_session = stripe.checkout.Session.create(**session_params)

        return {"sessionId": checkout_session.id, "url": checkout_session.url}

    except stripe.StripeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/customer-portal")
async def create_portal_session(
    request: Request,
    current_user: Annotated[dict, Depends(get_current_active_user)]
):
    customer_id = current_user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No active subscription found")

    try:
        # Construct return URL
        origin = request.headers.get("origin") or "https://startamarkets.com"
        return_url = f"{origin}/dashboard"
        
        portalSession = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {"url": portalSession.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
