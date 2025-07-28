DROP TABLE IF EXISTS ts_data;

CREATE TABLE ts_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    temperature FLOAT NOT NULL,
    recorded_at TIMESTAMP NOT NULL
);

INSERT INTO ts_data (device_id, temperature, recorded_at) VALUES
('sensor_A', 23.5, '2025-07-28 08:15:00'),
('sensor_A', 24.2, '2025-07-28 09:30:00'),
('sensor_A', 25.1, '2025-07-28 09:45:00'),
('sensor_B', 26.0, '2025-07-28 08:20:00'),
('sensor_B', 27.4, '2025-07-28 09:10:00'),
('sensor_B', 28.3, '2025-07-28 09:50:00');

SELECT * FROM ts_data ORDER BY recorded_at;

SELECT
    device_id,
    substr(CAST(recorded_at AS TEXT), 1, 13) || ':00:00' AS hour_slot,
    AVG(temperature) AS avg_temperature
FROM
    ts_data
GROUP BY
    device_id,
    hour_slot
ORDER BY
    device_id,
    hour_slot;

SELECT * FROM ts_data ORDER BY recorded_at DESC LIMIT 3;
