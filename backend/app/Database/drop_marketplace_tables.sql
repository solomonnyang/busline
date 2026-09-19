-- One-time cleanup: drop all tables for the removed Explore/marketplace/places feature.
-- Run only after the app code has been fully migrated. This is destructive and irreversible.
--
-- Usage:
--   mysql -h 127.0.0.1 -u root bus_booking < backend/app/Database/drop_marketplace_tables.sql

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS food_orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menu_categories;
DROP TABLE IF EXISTS hotel_bookings;
DROP TABLE IF EXISTS room_images;
DROP TABLE IF EXISTS hotel_rooms;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS push_tokens;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS marketplace_payments;
DROP TABLE IF EXISTS places;

SET FOREIGN_KEY_CHECKS = 1;
