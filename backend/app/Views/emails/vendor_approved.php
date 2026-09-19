<?php $name = $user['name'] ?? 'there'; $company = $vendor['company_name'] ?? 'your company'; ?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Great news — you're approved! ✅</div>
<p style="margin:0 0 16px;">Hi <?= esc($name) ?>, your vendor account for <strong><?= esc($company) ?></strong> has been approved by our team.</p>

<div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
  <div style="font-weight:bold;color:#166534;margin-bottom:4px;">You can now:</div>
  <ul style="margin:0;padding-left:18px;color:#14532D;font-size:14px;line-height:1.9;">
    <li>Add your buses and seat layouts</li>
    <li>Create routes and schedule trips</li>
    <li>Sell tickets and validate passengers with QR scans</li>
    <li>Track revenue and withdraw earnings</li>
  </ul>
</div>

<p style="margin:0 0 24px;">Sign in to your dashboard and get started.</p>

<p align="center" style="margin:0;">
  <a href="<?= esc($siteUrl . '/login') ?>" style="background-color:#0E9384;color:#ffffff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Open vendor dashboard</a>
</p>
