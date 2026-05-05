<?php
/**
 * counter.php — Contador de visitas para Poker Combat Bot landing page
 *
 * Guarda los datos en counter_data.json (misma carpeta).
 * Devuelve JSON con:
 *   - total:     visitas totales desde el inicio
 *   - last_hour: visitas en los últimos 60 minutos
 *
 * REQUISITOS: PHP 7.0+ con permisos de escritura en la carpeta.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store, no-cache, must-revalidate');

$dataFile = __DIR__ . '/counter_data.json';
$lockFile = __DIR__ . '/counter.lock';

/* ── Carga datos existentes ── */
$data = ['total' => 0, 'hourly' => []];

if (file_exists($dataFile)) {
    $raw = file_get_contents($dataFile);
    if ($raw) {
        $parsed = json_decode($raw, true);
        if (is_array($parsed)) $data = $parsed;
    }
}

$now        = time();
$currentKey = date('YmdH', $now);          // e.g. "2026041415" = día + hora
$cutoffKey  = date('YmdH', $now - 7200);   // hace 2 horas (limpiamos entradas viejas)

/* ── Limpia entradas de más de 2 horas ── */
foreach (array_keys($data['hourly']) as $k) {
    if ($k < $cutoffKey) unset($data['hourly'][$k]);
}

/* ── Incrementa contadores ── */
$data['total']++;

if (!isset($data['hourly'][$currentKey])) {
    $data['hourly'][$currentKey] = 0;
}
$data['hourly'][$currentKey]++;

/* ── Suma última hora: la clave actual + la anterior ── */
$prevKey      = date('YmdH', $now - 3600);
$lastHour     = ($data['hourly'][$currentKey] ?? 0)
              + ($data['hourly'][$prevKey]     ?? 0);

/* ── Guarda con bloqueo para evitar corrupción en concurrencia ── */
$fp = fopen($lockFile, 'w');
if ($fp && flock($fp, LOCK_EX)) {
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
}
if ($fp) fclose($fp);

/* ── Respuesta ── */
echo json_encode([
    'total'     => $data['total'],
    'last_hour' => $lastHour,
    'ok'        => true
]);
