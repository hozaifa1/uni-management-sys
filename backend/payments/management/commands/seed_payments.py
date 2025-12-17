from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from decimal import Decimal

from accounts.models import Student
from payments.models import Payment


class Command(BaseCommand):
    help = 'Seed the database with sample payments of different fee types'

    FEE_TYPES = [
        ('semester_fee', 15000, 25000),
        ('tuition_fee', 8000, 15000),
        ('admission_fee', 5000, 10000),
        ('exam_fee', 1000, 3000),
        ('lab_fee', 500, 2000),
        ('library_fee', 300, 1000),
        ('fine', 100, 500),
    ]

    PAYMENT_METHODS = ['cash', 'bank_transfer', 'online']
    REGULARITIES = ['regular', 'late']

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of payments to create (default: 50)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing payments before seeding'
        )

    def handle(self, *args, **options):
        count = options['count']
        clear = options['clear']

        if clear:
            deleted_count = Payment.objects.all().delete()[0]
            self.stdout.write(self.style.WARNING(f'Deleted {deleted_count} existing payments'))

        students = list(Student.objects.all())
        if not students:
            self.stdout.write(self.style.ERROR('No students found. Please seed students first.'))
            return

        payments_created = 0
        
        for _ in range(count):
            student = random.choice(students)
            fee_type, min_amount, max_amount = random.choice(self.FEE_TYPES)
            amount = Decimal(random.randint(min_amount, max_amount))
            
            # Random discount (0-20% chance of having discount)
            discount = Decimal('0.00')
            if random.random() < 0.2:
                discount = amount * Decimal(random.uniform(0.05, 0.15))
                discount = discount.quantize(Decimal('0.01'))
            
            # Random date within last 6 months
            days_ago = random.randint(0, 180)
            payment_date = timezone.now().date() - timedelta(days=days_ago)
            
            # Determine regularity based on fee type
            regularity = 'late' if fee_type == 'fine' else random.choices(
                self.REGULARITIES, 
                weights=[0.85, 0.15]
            )[0]
            
            Payment.objects.create(
                student=student,
                amount_paid=amount,
                discount_amount=discount,
                payment_date=payment_date,
                payment_method=random.choice(self.PAYMENT_METHODS),
                fee_type=fee_type,
                payment_regularity=regularity,
                transaction_id=f'TXN-{fee_type[:3].upper()}-{random.randint(100000, 999999)}',
                remarks=f'Payment for {fee_type.replace("_", " ")}' if random.random() < 0.3 else ''
            )
            payments_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Successfully created {payments_created} payments with various fee types'
        ))
        
        # Print summary
        self.stdout.write('\nPayment Summary by Fee Type:')
        from django.db.models import Sum
        for fee_type, _, _ in self.FEE_TYPES:
            fee_count = Payment.objects.filter(fee_type=fee_type).count()
            self.stdout.write(f'  - {fee_type}: {fee_count} payments')
