from rest_framework import serializers

from .models import Payment, Expense


class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment model.
    """

    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True,
    )
    student_id = serializers.CharField(
        source='student.student_id',
        read_only=True,
    )
    net_amount = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'student_name', 'student_id',
            'fee_type', 'amount_paid', 'payment_date', 'payment_method',
            'transaction_id', 'discount_amount', 'net_amount',
            'payment_regularity', 'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_net_amount(self, obj: Payment) -> float:
        return float(obj.net_amount())

    def validate(self, attrs):
        amount_paid = attrs.get('amount_paid', 0)
        discount_amount = attrs.get('discount_amount', 0) or 0

        if amount_paid is None or amount_paid <= 0:
            raise serializers.ValidationError({
                'amount_paid': 'Amount paid must be greater than zero.',
            })

        if discount_amount < 0:
            raise serializers.ValidationError({
                'discount_amount': 'Discount amount cannot be negative.',
            })

        if discount_amount > amount_paid:
            raise serializers.ValidationError({
                'discount_amount': 'Discount cannot exceed amount paid.',
            })

        return attrs


class PaymentDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Payment serializer with nested student data.
    """

    from accounts.serializers import StudentSerializer

    student = StudentSerializer(read_only=True)
    net_amount = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'fee_type', 'amount_paid',
            'payment_date', 'payment_method', 'transaction_id',
            'discount_amount', 'net_amount', 'payment_regularity',
            'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_net_amount(self, obj: Payment) -> float:
        return float(obj.net_amount())


class ExpenseSerializer(serializers.ModelSerializer):
    """
    Serializer for Expense model.
    """

    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
    )

    class Meta:
        model = Expense
        fields = [
            'id', 'expense_type', 'amount', 'description',
            'expense_date', 'paid_to', 'created_by', 'created_by_name',
            'receipt_file', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value


class PaymentStatisticsSerializer(serializers.Serializer):
    """
    Serializer for payment statistics — actuals only, no expected/due figures.
    """

    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=0)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=0)
    net_profit = serializers.DecimalField(max_digits=15, decimal_places=0)
    total_students = serializers.IntegerField()
    monthly_breakdown = serializers.ListField(child=serializers.DictField())
