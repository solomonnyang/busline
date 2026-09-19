<?php
$name  = $user['name'] ?? 'there';
$link  = $siteUrl . '/reset-password?token=' . urlencode($token) . '&email=' . rawurlencode($user['email'] ?? '');
?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Forgot your password?</div>
<p style="margin:0 0 16px;">Hi <?= esc($name) ?>, we received a request to reset the password for your BusLine account.</p>

<p style="margin:0 0 16px;">Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>

<p align="center" style="margin:0 0 22px;">
  <a href="<?= esc($link) ?>" style="background-color:#0E9384;color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Reset my password</a>
</p>

<p style="margin:0 0 16px;">If the button doesn't work, copy and paste this link into your browser:</p>
<p style="margin:0;word-break:break-all;font-size:12.5px;background-color:#F1F5F9;border-radius:8px;padding:12px 14px;color:#334155;"><?= esc($link) ?></p>

<div style="margin-top:22px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">
  If you didn't request this, you can safely ignore this email — your password won't change.
</div>
