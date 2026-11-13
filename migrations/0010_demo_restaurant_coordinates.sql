-- +goose Up
-- Демо-рестораны: адреса и координаты приведены к реальным домам Тольятти.
-- Точки на карте должны совпадать с адресами из карточки ресторана.
UPDATE restaurants SET address = 'бульвар Ленина, 10', lat = 53.504806, lon = 49.419678
WHERE id = '10000000-0000-4000-8000-000000000001';

UPDATE restaurants SET address = 'ул. Мира, 23', lat = 53.506044, lon = 49.399293
WHERE id = '10000000-0000-4000-8000-000000000002';

UPDATE restaurants SET address = 'ул. Революционная, 5', lat = 53.533718, lon = 49.278874
WHERE id = '10000000-0000-4000-8000-000000000003';

UPDATE restaurants SET address = 'ул. Комсомольская, 8', lat = 53.511006, lon = 49.396961
WHERE id = '10000000-0000-4000-8000-000000000004';

UPDATE restaurants SET address = 'ул. Автостроителей, 15', lat = 53.539614, lon = 49.331641
WHERE id = '10000000-0000-4000-8000-000000000005';

UPDATE restaurants SET address = 'проспект Степана Разина, 33', lat = 53.523039, lon = 49.296938
WHERE id = '10000000-0000-4000-8000-000000000006';

UPDATE restaurants SET address = 'ул. Победы, 12', lat = 53.524899, lon = 49.429308
WHERE id = '10000000-0000-4000-8000-000000000007';

UPDATE restaurants SET address = 'ул. Юбилейная, 40', lat = 53.501197, lon = 49.272552
WHERE id = '10000000-0000-4000-8000-000000000008';

UPDATE restaurants SET address = 'ул. Лизы Чайкиной, 21', lat = 53.484361, lon = 49.463146
WHERE id = '10000000-0000-4000-8000-000000000009';

UPDATE restaurants SET address = 'ул. Маршала Жукова, 3', lat = 53.514810, lon = 49.310844
WHERE id = '10000000-0000-4000-8000-000000000010';

UPDATE restaurants SET address = 'ул. Новозаводская, 19А', lat = 53.547943, lon = 49.445821
WHERE id = '10000000-0000-4000-8000-000000000011';

UPDATE restaurants SET address = 'ул. Голосова, 24', lat = 53.511372, lon = 49.431777
WHERE id = '10000000-0000-4000-8000-000000000012';

UPDATE restaurants SET address = 'ул. Ворошилова, 10', lat = 53.530582, lon = 49.310729
WHERE id = '10000000-0000-4000-8000-000000000013';

UPDATE restaurants SET address = 'ул. Комзина, 4', lat = 53.478532, lon = 49.368792
WHERE id = '10000000-0000-4000-8000-000000000014';

UPDATE restaurants SET address = 'ул. Кирова, 15', lat = 53.533839, lon = 49.399347
WHERE id = '10000000-0000-4000-8000-000000000015';

UPDATE restaurants SET address = 'ул. Баныкина, 11', lat = 53.499087, lon = 49.413167
WHERE id = '10000000-0000-4000-8000-000000000016';

UPDATE restaurants SET address = 'ул. Ленинградская, 20', lat = 53.504173, lon = 49.399279
WHERE id = '10000000-0000-4000-8000-000000000017';

UPDATE restaurants SET address = 'ул. Победы, 30', lat = 53.518857, lon = 49.426398
WHERE id = '10000000-0000-4000-8000-000000000018';

UPDATE restaurants SET address = 'ул. Автозаводское шоссе, 6', lat = 53.541125, lon = 49.390782
WHERE id = '10000000-0000-4000-8000-000000000019';

UPDATE restaurants SET address = 'ул. Офицерская, 8', lat = 53.544973, lon = 49.319755
WHERE id = '10000000-0000-4000-8000-000000000020';

-- +goose Down
-- Данные не откатываем: старые координаты были некорректны.
SELECT 1;
