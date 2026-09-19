<?php
/**
 * Reusable booking summary block. Expects $booking (detailed row) and $seats.
 */
$origin      = $booking['origin_city'] ?? '—';
$destination = $booking['destination_city'] ?? '—';
$departure   = ! empty($booking['departure_date'])
    ? date('D, j M Y', strtotime((string) $booking['departure_date']))
    : '—';
$time        = $booking['departure_time'] ?? '—';
$bus         = $booking['bus_name'] ?? $booking['bus_type'] ?? '—';
$vendor      = $booking['vendor_name'] ?? '—';
$total       = number_format((float) ($booking['total_amount'] ?? 0), 2);
$seatsList   = array_map(
    fn ($s) => ($s['seat_number'] ?? 'Seat')
        . (($s['passenger_name'] ?? '') !== '' ? ' (' . $s['passenger_name'] . ')' : ''),
    is_array($seats) ? $seats : []
);
?>
<div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin:0 0 20px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background-color:#0E9384;color:#ffffff;padding:12px 16px;font-size:14px;font-weight:bold;">
        Booking <?= esc($booking['booking_number'] ?? '') ?>
      </td>
      <td style="background-color:#0E9384;color:rgba(255,255,255,.9);padding:12px 16px;font-size:13px;text-align:right;">
        <?= esc($booking['status'] ?? '') ?>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:6px 16px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;color:#334155;">
          <tr>
            <td style="padding:8px 0;color:#94A3B8;width:38%;">Route</td>
            <td style="padding:8px 0;font-weight:bold;"><?= esc($origin) ?> → <?= esc($destination) ?></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8;">Departure</td>
            <td style="padding:8px 0;font-weight:bold;"><?= esc($departure) ?> at <?= esc($time) ?></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8;">Operator</td>
            <td style="padding:8px 0;"><?= esc($vendor) ?> — <?= esc($bus) ?></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8;">Seats</td>
            <td style="padding:8px 0;"><?= esc(implode(', ', $seatsList)) ?></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8;">Total</td>
            <td style="padding:8px 0;font-weight:bold;font-size:16px;color:#0A6B60;">₦<?= $total ?></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
