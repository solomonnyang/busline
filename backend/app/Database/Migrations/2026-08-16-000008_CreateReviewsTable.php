<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the reviews table.
 * Customer reviews for a completed trip/booking, rated 1-5 with optional
 * comment and a vendor reply. Vendors can see and reply to their own reviews.
 */
class CreateReviewsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'booking_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'trip_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'vendor_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'customer_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'rating'      => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'null' => false],
            'comment'     => ['type' => 'TEXT', 'null' => true],
            'status'      => ['type' => "ENUM('pending','published','hidden')", 'default' => 'pending', 'null' => false],
            'reply'       => ['type' => 'TEXT', 'null' => true],
            'replied_at'  => ['type' => 'DATETIME', 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('status');
        $this->forge->addKey('booking_id');
        $this->forge->addForeignKey('booking_id', 'bookings', 'id', 'SET_NULL', 'CASCADE', 'fk_reviews_booking');
        $this->forge->addForeignKey('trip_id', 'trips', 'id', 'SET_NULL', 'CASCADE', 'fk_reviews_trip');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_reviews_vendor');
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'CASCADE', 'RESTRICT', 'fk_reviews_customer');
        $this->forge->createTable('reviews');
    }

    public function down()
    {
        $this->forge->dropTable('reviews');
    }
}
