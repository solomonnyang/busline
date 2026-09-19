<?php $name = $user['name'] ?? 'there'; $refunded = ($booking['payment_status'] ?? '') === 'refunded'; ?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Your booking was cancelled</div>
<p style="margin:0 0 18px;">Hi <?= esc($name) ?>, your booking below has been cancelled:</p>

<?= view('emails/partials/booking_summary', ['booking' => $booking, 'seats' => []]) ?>

<?php if ($refunded): ?>
<div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:14px 18px;margin:0 0 20px;">
  <p style="margin:0;color:#166534;font-size:13.5px;line-height:1.7;">
    <strong>Refunded.</strong> The amount paid has been credited back to your BusLine wallet. You can use it for your next trip or withdraw it.
  </p>
</div>
<?php endif; ?>

<p style="margin:0 0 24px;">We hope to see you on a trip soon. If you didn't cancel this booking, please contact support immediately.</p>
