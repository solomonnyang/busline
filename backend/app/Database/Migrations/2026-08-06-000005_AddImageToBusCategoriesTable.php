<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds an image URL to bus_categories so admins can display a picture
 * for each bus class (e.g. standard, luxury, vip).
 */
class AddImageToBusCategoriesTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('bus_categories', [
            'image' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true, 'after' => 'description'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('bus_categories', 'image');
    }
}
