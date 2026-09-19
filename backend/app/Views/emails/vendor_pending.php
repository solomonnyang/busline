<?php $name = $user['name'] ?? 'there'; $company = $vendor['company_name'] ?? 'your company'; ?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Thanks for registering, <?= esc($name) ?>!</div>
<p style="margin:0 0 16px;">Your vendor account for <strong><?= esc($company) ?></strong> has been submitted and is now <strong>pending admin approval</strong>.</p>

<div style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
  <div style="font-weight:bold;color:#92400E;margin-bottom:4px;">⏳ What happens next:</div>
  <ol style="margin:0;padding-left:18px;color:#78350F;font-size:14px;line-height:1.9;">
    <li>Our team reviews your details</li>
    <li>You'll receive an email once approved</li>
    <li>Then you can list buses, set up trips and sell tickets</li>
  </ol>
</div>

<p style="margin:0 0 24px;">Approval usually takes less than 24 hours. If you have questions, just reply to this email.</p>

<p align="center" style="margin:0;">
  <a href="<?= esc($siteUrl) ?>" style="background-color:#0E9384;color:#ffffff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Go to BusLine</a>
</p>
