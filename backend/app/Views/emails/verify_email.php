<?php
$name = $user['name'] ?? 'there';
$link = $siteUrl . '/verify-email?email=' . rawurlencode($user['email'] ?? '') . '&code=' . rawurlencode($code);
?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Please verify your email</div>
<p style="margin:0 0 16px;">Hi <?= esc($name) ?>, welcome to BusLine! Confirm your email address to activate your account and start booking your trips.</p>

<p style="margin:0 0 12px;">Enter this code on the verification screen. It is valid for <strong>24 hours</strong>.</p>

<p align="center" style="margin:0 0 22px;">
  <span style="display:inline-block;font-size:32px;font-weight:bold;letter-spacing:10px;color:#0E9384;background-color:#F1F5F9;border-radius:12px;padding:14px 22px;"><?= esc($code) ?></span>
</p>

<p style="margin:0 0 16px;">Or click the button below to verify automatically:</p>
<p align="center" style="margin:0 0 22px;">
  <a href="<?= esc($link) ?>" style="background-color:#0E9384;color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Verify my email</a>
</p>

<p style="margin:0 0 16px;">If the button doesn't work, copy and paste this link into your browser:</p>
<p style="margin:0;word-break:break-all;font-size:12.5px;background-color:#F1F5F9;border-radius:8px;padding:12px 14px;color:#334155;"><?= esc($link) ?></p>

<div style="margin-top:22px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">
  If you didn't create a BusLine account, you can safely ignore this email.
</div>
