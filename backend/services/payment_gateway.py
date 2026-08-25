from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class PaymentGatewayService(ABC):
    """
    Abstract payment gateway interface.
    Future gateways (Razorpay, Stripe, etc.) should implement this interface.
    IMPORTANT: Do NOT tightly couple business logic to any specific provider.
    """
    
    @abstractmethod
    def create_payment(self, settlement_id: int, amount: float, vendor_id: str, currency: str = 'INR') -> Dict[str, Any]:
        """Create a payment record. Returns payment reference and status."""
        raise NotImplementedError
    
    @abstractmethod
    def verify_payment(self, payment_reference: str) -> Dict[str, Any]:
        """Verify payment status from gateway."""
        raise NotImplementedError
    
    @abstractmethod
    def get_payment_status(self, payment_reference: str) -> str:
        """Get current payment status: PENDING|PROCESSING|SUCCESS|FAILED|CANCELLED|REFUNDED"""
        raise NotImplementedError
    
    @abstractmethod
    def refund_payment(self, payment_reference: str, amount: Optional[float] = None, reason: str = '') -> Dict[str, Any]:
        """Initiate a refund. amount=None means full refund."""
        raise NotImplementedError


class ManualSettlementGateway(PaymentGatewayService):
    """
    Current implementation: manual/offline settlement tracking.
    Settlements are recorded manually without electronic payment processing.
    Use this until a real gateway is integrated.
    IMPORTANT: This does NOT imply an actual electronic payment was made.
    """
    
    def create_payment(self, settlement_id: int, amount: float, vendor_id: str, currency: str = 'INR') -> Dict[str, Any]:
        return {
            'payment_reference': f'MANUAL-SETTLE-{settlement_id}',
            'status': 'SUCCESS',
            'method': 'MANUAL',
            'note': 'Settlement recorded manually. No electronic payment gateway active.'
        }
    
    def verify_payment(self, payment_reference: str) -> Dict[str, Any]:
        return {'status': 'SUCCESS', 'note': 'Manual settlement — no gateway verification required.'}
    
    def get_payment_status(self, payment_reference: str) -> str:
        return 'SUCCESS'
    
    def refund_payment(self, payment_reference: str, amount: Optional[float] = None, reason: str = '') -> Dict[str, Any]:
        return {'status': 'REFUNDED', 'note': 'Manual refund recorded. No gateway reversal.'}


def get_payment_gateway() -> PaymentGatewayService:
    """Factory function to get the active payment gateway."""
    return ManualSettlementGateway()
