<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class MultiSheetExport implements WithMultipleSheets
{
    /**
     * @param  array<int, ArraySheetExport>  $sheets
     */
    public function __construct(protected array $sheets) {}

    public function sheets(): array
    {
        return $this->sheets;
    }
}
