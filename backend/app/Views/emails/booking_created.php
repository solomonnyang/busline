<?php $name = $user['name'] ?? 'there'; ?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">We've received your booking ✅</div>
<p style="margin:0 0 18px;">Hi <?= esc($name) ?>, your booking has been created but the payment is still pending. Here's a summary:</p>

<?= view('emails/partials/booking_summary', ['booking' => $booking, 'seats' => $seats ?? []]) ?>

<div style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:14px 18px;margin:0 0 20px;">
  <p style="margin:0;color:#92400E;font-size:13.5px;line-height:1.7;">
    <strong>⚠️ Payment pending.</strong> Your seats are reserved. Complete the payment to confirm your ticket — the seats will be released if payment isn't completed.
  </p>
</div>

<p style="margin:0 0 24px;">Need help? Reply to this email and we'll assist you.</p>
