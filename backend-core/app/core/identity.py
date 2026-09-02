"""
Canonical identity values.

Deliberately dependency-free so it can be imported (and tested) without pulling
the database, the settings object or the whole FastAPI app.
"""


def normalize_email(email: str) -> str:
    """
    Canonical form of an address: trimmed and lower-cased.

    `users.email` is a case-SENSITIVE unique column, so before this existed
    "Ahmed@Gmail.com" and "ahmed@gmail.com" were two different accounts
    (reproduced in production: ids 687 and 688) and the person who registered
    with a capital letter — which every phone keyboard offers by default —
    could not sign back in once they typed it in lower case.

    Applied at every boundary that accepts an address: signup, both login
    grants, and the Next.js proxy routes in front of them.
    """
    return email.strip().lower()
