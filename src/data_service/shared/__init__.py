"""Shared trading primitives that can be reused across services.

Heavy dependencies (e.g., boto3/pandas in Market) are lazily imported so modules
that only need lightweight helpers don’t require the full dependency set.
"""

__all__ = [
    "RedisSubscriber",
]


def __getattr__(name):

    if name == "RedisSubscriber":
        from .subscriber import RedisSubscriber

        return RedisSubscriber

    raise AttributeError(f"module 'shared' has no attribute '{name}'")
