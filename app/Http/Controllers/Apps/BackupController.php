<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\BackupService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class BackupController extends Controller
{
    public function __construct(
        private readonly BackupService $backupService,
        private readonly AuditLogService $auditLogService
    ) {}

    /**
     * Display the backup and restore page.
     */
    public function index()
    {
        return Inertia::render('Dashboard/Settings/Backups/Index', [
            'backups' => $this->backupService->getBackups(),
        ]);
    }

    /**
     * Create a new backup (database or full zip).
     */
    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:database,full',
        ]);

        try {
            if ($request->type === 'full') {
                $filename = $this->backupService->createFullBackup();
                $message = 'Backup sistem lengkap (.zip) berhasil dibuat.';
            } else {
                $filename = $this->backupService->createDatabaseBackup();
                $message = 'Backup database (.sql) berhasil dibuat.';
            }

            $this->auditLogService->log(
                'create',
                'backups',
                ['filename' => $filename, 'type' => $request->type],
                "Membuat backup {$request->type}: {$filename}"
            );

            return back()->with('success', $message);
        } catch (Exception $e) {
            return back()->with('error', 'Gagal membuat backup: '.$e->getMessage());
        }
    }

    /**
     * Download a backup file.
     */
    public function download(string $filename)
    {
        try {
            $path = $this->backupService->getBackupPath($filename);

            $this->auditLogService->log(
                'download',
                'backups',
                ['filename' => $filename],
                "Mengunduh file backup: {$filename}"
            );

            return response()->download($path);
        } catch (Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Restore database/system from a backup file (uploaded file or existing backup file).
     */
    public function restore(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
            'filename' => 'nullable|string',
            'backup_file' => 'nullable|file|mimes:sql,zip|max:102400', // 100MB max upload
        ]);

        // Verify password for safety
        if (! Hash::check($request->password, $request->user()->password)) {
            return back()->with('error', 'Password yang Anda masukkan salah. Proses restore dibatalkan.');
        }

        if (! $request->filename && ! $request->hasFile('backup_file')) {
            return back()->with('error', 'Pilih file backup yang ada atau upload file backup baru.');
        }

        try {
            // Auto safety backup before running restore
            $this->backupService->createDatabaseBackup('auto-safety-backup-'.date('Y-m-d_H-i-s').'.sql');

            if ($request->hasFile('backup_file')) {
                $uploadedFile = $request->file('backup_file');
                $tempPath = $uploadedFile->getRealPath();
                $this->backupService->restoreBackup($tempPath);
                $restoredSource = 'File Upload ('.$uploadedFile->getClientOriginalName().')';
            } else {
                $filePath = $this->backupService->getBackupPath($request->filename);
                $this->backupService->restoreBackup($filePath);
                $restoredSource = 'File System ('.$request->filename.')';
            }

            $this->auditLogService->log(
                'restore',
                'backups',
                ['source' => $restoredSource],
                "Melakukan restore database dari sumber: {$restoredSource}"
            );

            return back()->with('success', 'Database dan sistem berhasil di-restore kembali.');
        } catch (Exception $e) {
            return back()->with('error', 'Gagal melakukan restore: '.$e->getMessage());
        }
    }

    /**
     * Delete a backup file.
     */
    public function destroy(string $filename)
    {
        try {
            $this->backupService->deleteBackup($filename);

            $this->auditLogService->log(
                'delete',
                'backups',
                ['filename' => $filename],
                "Menghapus file backup: {$filename}"
            );

            return back()->with('success', 'File backup berhasil dihapus.');
        } catch (Exception $e) {
            return back()->with('error', 'Gagal menghapus file backup: '.$e->getMessage());
        }
    }
}
