DELETE FROM Geo WHERE user_id = 'superadmin@example.com';
INSERT INTO Geo (geo_id, user_id, country_code, postal_code, prefecture, city, town, building_name, room_number, latitude, longitude, is_primary)
VALUES ('test-geo-superadmin', 'superadmin@example.com', 'JP', '105-0011', 'Tokyo', 'Minato City', 'Shibakoen 4-2-8', 'Tokyo Tower', '', 35.6586, 139.7454, 1);
