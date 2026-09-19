<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class CURLRequest extends BaseConfig
{
    /**
     * Share connection options between requests.
     *
     * Note: CURL_LOCK_DATA_* constants are only available on PHP >= 8.2
     * with libcurl >= 7.72. They are disabled here for compatibility.
     *
     * @var list<int>
     */
    public array $shareConnectionOptions = [];

    /**
     * Whether share options between requests or not.
     */
    public bool $shareOptions = false;
}
