<?php
/**
 * Shared email layout. Expects $title (email subject) and $body (rendered HTML).
 * Inline CSS only for maximum client compatibility.
 */
$brand    = '#0E9384';
$brandDark = '#0A6B60';
$accent   = '#C7792B';
$ink      = '#0F172A';
$muted    = '#64748B';
$border   = '#E2E8F0';
$bg       = '#F4F6FB';
$surface  = '#FFFFFF';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title><?= esc($title ?? 'BusLine') ?></title>
</head>
<body style="margin:0;padding:0;background-color:<?= $bg ?>;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:<?= $bg ?>;padding:28px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:<?= $surface ?>;border-radius:16px;overflow:hidden;border:1px solid <?= $border ?>;">

        <!-- Header -->
        <tr>
          <td style="background-color:<?= $brand ?>;padding:26px 32px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:.3px;">🚌 BusLine</div>
            <div style="color:rgba(255,255,255,.88);font-size:12.5px;margin-top:4px;text-transform:uppercase;letter-spacing:1.5px;"><?= esc($title ?? '') ?></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:34px 36px;color:<?= $ink ?>;font-size:15px;line-height:1.65;">
            <?= $body ?>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:22px 32px;background-color:#F8FAFC;border-top:1px solid <?= $border ?>;text-align:center;color:<?= $muted ?>;font-size:12px;line-height:1.7;">
            <div style="font-weight:bold;color:<?= $ink ?>;margin-bottom:4px;">BusLine — travel smarter</div>
            <div>Compare buses, pick your seat, pay securely and board with a QR ticket.</div>
            <div style="margin-top:10px;">
              <a href="<?= esc($siteUrl ?? '') ?>" style="color:<?= $brand ?>;text-decoration:none;font-weight:bold;">Visit BusLine</a>
            </div>
            <div style="margin-top:12px;color:#94A3B8;">You received this email because you have an account on BusLine.<br />If this wasn't you, please contact support.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
