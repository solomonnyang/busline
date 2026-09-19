<?php $name = $user['name'] ?? 'there'; $company = $vendor['company_name'] ?? 'your company'; ?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Your vendor account status was updated</div>
<p style="margin:0 0 16px;">Hi <?= esc($name) ?>, the status of your vendor account for <strong><?= esc($company) ?></strong> is now <strong><?= esc(ucfirst($status ?? 'suspended')) ?></strong>.</p>

<div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
  <p style="margin:0;color:#991B1B;font-size:14px;line-height:1.7;">
    If you believe this is a mistake or need help, please contact our support team and we'll look into it right away.
  </p>
</div>

<p align="center" style="margin:0;">
  <a href="<?= esc($siteUrl . '/support') ?>" style="background-color:#C7792B;color:#ffffff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Contact support</a>
</p>
