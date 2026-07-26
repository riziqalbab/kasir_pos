<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class BackupService
{
    protected string $backupDir;

    public function __construct()
    {
        $this->backupDir = storage_path('app/backups');
        if (! File::exists($this->backupDir)) {
            File::makeDirectory($this->backupDir, 0755, true);
        }
    }

    /**
     * Get list of all backup files sorted by creation date (newest first).
     */
    public function getBackups(): array
    {
        if (! File::exists($this->backupDir)) {
            return [];
        }

        $files = File::files($this->backupDir);
        $backups = [];

        foreach ($files as $file) {
            $ext = strtolower($file->getExtension());
            if (! in_array($ext, ['sql', 'zip'])) {
                continue;
            }

            $sizeInBytes = $file->getSize();
            $formattedSize = $this->formatSizeBytes($sizeInBytes);

            $backups[] = [
                'filename' => $file->getFilename(),
                'size' => $formattedSize,
                'size_bytes' => $sizeInBytes,
                'created_at' => date('Y-m-d H:i:s', $file->getMTime()),
                'type' => $ext === 'zip' ? 'Full Backup (.zip)' : 'Database Only (.sql)',
                'extension' => $ext,
            ];
        }

        usort($backups, fn ($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return $backups;
    }

    /**
     * Create a database-only SQL backup dump file.
     */
    public function createDatabaseBackup(?string $customFilename = null): string
    {
        $filename = $customFilename ?? 'backup-db-'.date('Y-m-d_H-i-s').'.sql';
        $filePath = $this->backupDir.'/'.$filename;

        $sqlContent = $this->generateSqlDump();

        File::put($filePath, $sqlContent);

        return $filename;
    }

    /**
     * Create a full backup zip file containing DB dump + public storage files.
     */
    public function createFullBackup(): string
    {
        if (! class_exists('ZipArchive')) {
            throw new Exception('Ekstensi PHP ZipArchive tidak aktif pada server.');
        }

        $timestamp = date('Y-m-d_H-i-s');
        $zipFilename = 'backup-full-'.$timestamp.'.zip';
        $zipPath = $this->backupDir.'/'.$zipFilename;

        // Generate temporary SQL file
        $tempSqlFilename = 'db-dump-'.$timestamp.'.sql';
        $tempSqlPath = $this->backupDir.'/'.$tempSqlFilename;
        $sqlContent = $this->generateSqlDump();
        File::put($tempSqlPath, $sqlContent);

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            File::delete($tempSqlPath);
            throw new Exception('Gagal membuat file archive zip.');
        }

        // Add database dump file to zip root
        $zip->addFile($tempSqlPath, 'database.sql');

        // Add public storage directory to zip (products, logos, attachments)
        $publicStorage = storage_path('app/public');
        if (File::exists($publicStorage)) {
            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($publicStorage, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ($files as $file) {
                if (! $file->isDir()) {
                    $filePath = $file->getRealPath();
                    $relativePath = 'storage/'.substr($filePath, strlen($publicStorage) + 1);
                    $zip->addFile($filePath, $relativePath);
                }
            }
        }

        $zip->close();

        // Delete temporary SQL dump file
        File::delete($tempSqlPath);

        return $zipFilename;
    }

    /**
     * Restore database and files from a backup file (.sql or .zip).
     */
    public function restoreBackup(string $filePath): void
    {
        if (! File::exists($filePath)) {
            throw new Exception('File backup tidak ditemukan.');
        }

        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        if ($extension === 'sql') {
            $this->runSqlDumpFile($filePath);
        } elseif ($extension === 'zip') {
            if (! class_exists('ZipArchive')) {
                throw new Exception('Ekstensi PHP ZipArchive tidak aktif.');
            }

            $tempExtractPath = storage_path('app/backups/temp-extract-'.time());
            File::makeDirectory($tempExtractPath, 0755, true);

            try {
                $zip = new ZipArchive;
                if ($zip->open($filePath) === true) {
                    $zip->extractTo($tempExtractPath);
                    $zip->close();
                } else {
                    throw new Exception('Gagal membuka file ZIP backup.');
                }

                // Restore SQL file
                $extractedSql = $tempExtractPath.'/database.sql';
                if (File::exists($extractedSql)) {
                    $this->runSqlDumpFile($extractedSql);
                }

                // Restore storage files
                $extractedStorage = $tempExtractPath.'/storage';
                if (File::exists($extractedStorage)) {
                    $targetPublicStorage = storage_path('app/public');
                    File::copyDirectory($extractedStorage, $targetPublicStorage);
                }
            } finally {
                File::deleteDirectory($tempExtractPath);
            }
        } else {
            throw new Exception('Format file tidak didukung. Harap upload file .sql atau .zip.');
        }
    }

    /**
     * Delete a backup file.
     */
    public function deleteBackup(string $filename): void
    {
        $filePath = $this->backupDir.'/'.basename($filename);
        if (File::exists($filePath)) {
            File::delete($filePath);
        } else {
            throw new Exception('File backup tidak ditemukan.');
        }
    }

    /**
     * Get absolute path for a backup file.
     */
    public function getBackupPath(string $filename): string
    {
        $filePath = $this->backupDir.'/'.basename($filename);
        if (! File::exists($filePath)) {
            throw new Exception('File backup tidak ditemukan.');
        }

        return $filePath;
    }

    /**
     * Generate pure PHP SQL dump content.
     */
    protected function generateSqlDump(): string
    {
        $driver = config('database.default');
        $tables = $this->getDatabaseTables();

        $output = "-- POS Application Database Backup\n";
        $output .= '-- Generated: '.date('Y-m-d H:i:s')."\n";
        $output .= '-- Driver: '.$driver."\n\n";

        if ($driver === 'sqlite') {
            $output .= "PRAGMA foreign_keys = OFF;\n\n";
        } else {
            $output .= "SET FOREIGN_KEY_CHECKS = 0;\n";
            $output .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
            $output .= "SET time_zone = \"+00:00\";\n\n";
        }

        foreach ($tables as $table) {
            if ($table === 'migrations') {
                // Keep migrations table structure and data
            }

            // Table Structure
            $output .= "-- --------------------------------------------------------\n";
            $output .= "-- Table structure for table `$table`\n";
            $output .= "-- --------------------------------------------------------\n\n";
            $output .= "DROP TABLE IF EXISTS `$table`;\n";

            $createTableQuery = $this->getCreateTableScript($table, $driver);
            if ($createTableQuery) {
                $output .= $createTableQuery.";\n\n";
            }

            // Table Data
            $rows = DB::table($table)->get();
            if ($rows->count() > 0) {
                $output .= "-- Dumping data for table `$table`\n";
                foreach ($rows as $row) {
                    $rowArray = (array) $row;
                    $values = array_map(function ($value) {
                        if ($value === null) {
                            return 'NULL';
                        }

                        return "'".addslashes((string) $value)."'";
                    }, array_values($rowArray));

                    $columns = array_map(fn ($col) => "`$col`", array_keys($rowArray));

                    $output .= "INSERT INTO `$table` (".implode(', ', $columns).') VALUES ('.implode(', ', $values).");\n";
                }
                $output .= "\n";
            }
        }

        if ($driver === 'sqlite') {
            $output .= "PRAGMA foreign_keys = ON;\n";
        } else {
            $output .= "SET FOREIGN_KEY_CHECKS = 1;\n";
        }

        return $output;
    }

    /**
     * Run SQL commands from dump file safely.
     */
    protected function runSqlDumpFile(string $sqlFilePath): void
    {
        $driver = config('database.default');

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
        }

        try {
            $sqlContent = File::get($sqlFilePath);
            DB::unprepared($sqlContent);
        } catch (Exception $e) {
            Log::error('Error restoring database backup: '.$e->getMessage());
            throw new Exception('Gagal mengeksekusi file SQL restore: '.$e->getMessage());
        } finally {
            if ($driver === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = ON;');
            } else {
                DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
            }
        }
    }

    /**
     * Helper to get list of table names in current DB.
     */
    protected function getDatabaseTables(): array
    {
        $driver = config('database.default');

        if ($driver === 'sqlite') {
            $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

            return array_map(fn ($t) => $t->name, $tables);
        }

        $tables = DB::select('SHOW TABLES');
        $key = 'Tables_in_'.config('database.connections.mysql.database');

        return array_map(function ($tableObj) use ($key) {
            return $tableObj->$key ?? reset($tableObj);
        }, $tables);
    }

    /**
     * Helper to get CREATE TABLE script.
     */
    protected function getCreateTableScript(string $table, string $driver): ?string
    {
        if ($driver === 'sqlite') {
            $result = DB::select("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [$table]);

            return $result[0]->sql ?? null;
        }

        $result = DB::select("SHOW CREATE TABLE `$table`");

        return $result[0]->{'Create Table'} ?? null;
    }

    /**
     * Format bytes to readable size string.
     */
    protected function formatSizeBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2).' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2).' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2).' KB';
        }

        return $bytes.' bytes';
    }
}
