<?php $name = $user['name'] ?? 'there'; ?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Welcome to BusLine, <?= esc($name) ?>! 🎉</div>
<p style="margin:0 0 16px;">Thanks for creating an account. You can now book bus tickets online, choose your favourite seat and pay securely.</p>

<div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
  <div style="font-weight:bold;color:#166534;margin-bottom:4px;">What you can do now:</div>
  <ul style="margin:0;padding-left:18px;color:#14532D;font-size:14px;line-height:1.9;">
    <li>Search trips between cities and compare operators</li>
    <li>Pick your preferred seat on a live seat map</li>
    <li>Pay with card or wallet — get an instant QR ticket</li>
    <li>Earn loyalty points and referral bonuses</li>
  </ul>
</div>

<p style="margin:0 0 24px;">Let's get you travelling!</p>

<p align="center" style="margin:0;">
  <a href="<?= esc($siteUrl) ?>" style="background-color:#0E9384;color:#ffffff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Start booking</a>
</p>
