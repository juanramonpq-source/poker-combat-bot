<?php
/**
 * counter.php — Contador de visitas para la landing de PoCoBOT
 *
 * Guarda los datos en counter_data.json (misma carpeta).
 * Devuelve JSON con:
 *   - total:                  visitas totales desde el inicio
 *   - active_users_last_hour: usuarios únicos vistos en los últimos 60 minutos
 *
 * REQUISITOS: PHP 7.0+ con permisos de escritura en la carpeta.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store, no-cache, must-revalidate');

$dataFile = __DIR__ . '/counter_data.json';
$lockFile = __DIR__ . '/counter.lock';

$now = time();
$emptyData = [
    'total' => 0,
    'visitors' => []
];

function normalize_counter_data($data, $fallback) {
    if (!is_array($data)) return $fallback;
    if (!isset($data['total']) || !is_numeric($data['total'])) $data['total'] = 0;
    if (!isset($data['visitors']) || !is_array($data['visitors'])) $data['visitors'] = [];
    return $data;
}

function visitor_hash() {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
    $ip = trim(explode(',', $ip)[0]);
    $agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown-agent';

    return hash('sha256', $ip . '|' . $agent);
}

$fp = fopen($lockFile, 'c');
if (!$fp || !flock($fp, LOCK_EX)) {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'error' => 'counter_unavailable'
    ]);
    if ($fp) fclose($fp);
    exit;
}

/* ── Carga, actualiza y guarda bajo bloqueo para evitar corrupción ── */
$data = $emptyData;
if (is_readable($dataFile)) {
    $raw = file_get_contents($dataFile);
    if ($raw) {
        $parsed = json_decode($raw, true);
        $data = normalize_counter_data($parsed, $emptyData);
    }
}

/* Compatibilidad con el contador anterior, que usaba "hourly". */
unset($data['hourly']);

$cutoff = $now - 3600;
foreach ($data['visitors'] as $hash => $lastSeen) {
    if (!is_numeric($lastSeen) || (int) $lastSeen < $cutoff) {
        unset($data['visitors'][$hash]);
    }
}

$visitor = visitor_hash();
$data['total'] = (int) $data['total'] + 1;
$data['visitors'][$visitor] = $now;
$activeUsersLastHour = count($data['visitors']);

$encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
$saved = $encoded !== false ? file_put_contents($dataFile, $encoded, LOCK_EX) : false;
flock($fp, LOCK_UN);
fclose($fp);

if ($saved === false) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'counter_write_failed'
    ]);
    exit;
}

/* ── Respuesta ── */
echo json_encode([
    'total' => $data['total'],
    'active_users_last_hour' => $activeUsersLastHour,
    'last_hour' => $activeUsersLastHour,
    'ok' => true
]);
