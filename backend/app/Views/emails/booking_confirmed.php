<?php $name = $user['name'] ?? 'there'; ?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Your ticket is confirmed! 🎟️</div>
<p style="margin:0 0 18px;">Hi <?= esc($name) ?>, payment received. Your seats are locked in and your ticket is ready. Here's your booking summary:</p>

<?= view('emails/partials/booking_summary', ['booking' => $booking, 'seats' => $seats ?? []]) ?>

<p style="margin:0 0 20px;">Show your QR ticket at the terminal to board. Keep this email or view your ticket anytime from your BusLine account.</p>

<p align="center" style="margin:0;">
  <a href="<?= esc($siteUrl . '/login') ?>" style="background-color:#0E9384;color:#ffffff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">View my tickets</a>
</p>
