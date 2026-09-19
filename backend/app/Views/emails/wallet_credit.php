<?php
$name    = $user['name'] ?? 'there';
$amount  = number_format((float) ($amount ?? 0), 2);
$balance = number_format((float) ($wallet['balance'] ?? 0), 2);
$ref     = $transaction['reference'] ?? '—';
?>
<div style="font-size:19px;font-weight:bold;margin-bottom:16px;">Your wallet was credited 💰</div>
<p style="margin:0 0 18px;">Hi <?= esc($name) ?>, we've received your top-up. Here are the details:</p>

<div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#334155;">
    <tr>
      <td style="padding:6px 0;color:#94A3B8;">Amount credited</td>
      <td style="padding:6px 0;font-weight:bold;font-size:17px;color:#166534;">₦<?= $amount ?></td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#94A3B8;">New balance</td>
      <td style="padding:6px 0;font-weight:bold;">₦<?= $balance ?></td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#94A3B8;">Reference</td>
      <td style="padding:6px 0;"><?= esc($ref) ?></td>
    </tr>
  </table>
</div>

<p style="margin:0 0 24px;">Your wallet is ready to use for your next booking.</p>
