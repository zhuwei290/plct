-- specialties
INSERT INTO specialties (name) VALUES ('牙科');
INSERT INTO specialties (name) VALUES ('放射科');
INSERT INTO specialties (name) VALUES ('手术');

-- vets
INSERT INTO vets (first_name, last_name) VALUES ('晨曦', '李');
INSERT INTO vets (first_name, last_name) VALUES ('婷雅', '周');
INSERT INTO vets (first_name, last_name) VALUES ('强', '孙');
INSERT INTO vets (first_name, last_name) VALUES ('静', '林');
INSERT INTO vets (first_name, last_name) VALUES ('鹏', '高');
INSERT INTO vets (first_name, last_name) VALUES ('默', '陈');
INSERT INTO vets (first_name, last_name) VALUES ('昊', '吴');
INSERT INTO vets (first_name, last_name) VALUES ('静', '何');
INSERT INTO vets (first_name, last_name) VALUES ('晓', '孟');
INSERT INTO vets (first_name, last_name) VALUES ('婧', '罗');

-- vet_specialties (vet_id, specialty_id)
-- specialties inserted in order: 1=牙科, 2=放射科, 3=手术
INSERT INTO vet_specialties VALUES (1, 3);      -- 李晨曦: 手术
INSERT INTO vet_specialties VALUES (2, 1);      -- 周婷雅: 牙科
INSERT INTO vet_specialties VALUES (2, 3);      -- 周婷雅: 手术
INSERT INTO vet_specialties VALUES (3, 2);      -- 孙强: 放射科
INSERT INTO vet_specialties VALUES (4, 1);      -- 林静: 牙科
INSERT INTO vet_specialties VALUES (5, 3);      -- 高鹏: 手术
INSERT INTO vet_specialties VALUES (5, 2);      -- 高鹏: 放射科
-- vet 6 (陈默) 无特长
INSERT INTO vet_specialties VALUES (7, 3);      -- 吴昊: 手术
INSERT INTO vet_specialties VALUES (8, 1);      -- 何静: 牙科
-- vet 9 (孟晓) 无特长
INSERT INTO vet_specialties VALUES (10, 2);     -- 罗婧: 放射科
INSERT INTO vet_specialties VALUES (10, 3);     -- 罗婧: 手术

-- types
INSERT INTO types (name) VALUES ('猫');
INSERT INTO types (name) VALUES ('狗');
INSERT INTO types (name) VALUES ('蜥蜴');
INSERT INTO types (name) VALUES ('蛇');
INSERT INTO types (name) VALUES ('鸟');
INSERT INTO types (name) VALUES ('仓鼠');

-- owners (first_name, last_name, address, city, telephone)
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('磊', '王', '长安路56号3单元101室', '北京', '8813812345');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('晓梅', '张', '虹桥路200号8楼', '上海', '8821556677');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('想', '李', '天河区体育西路12号', '广州', '8818877665');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('蕾', '赵', '南山区粤海街9号', '深圳', '8875512340');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('凯', '周', '西湖区文三路88号', '杭州', '8857199887');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('婷婷', '陈', '武昌区中北路45号', '武汉', '8827334455');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('洋', '刘', '鼓楼区汉中路77号', '南京', '8822585000');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('明', '何', '李沧区春阳路6号', '青岛', '8853277889');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('娜', '徐', '天府新区幸福街18号', '成都', '8828812345');
INSERT INTO owners (first_name, last_name, address, city, telephone) VALUES ('凯', '孟', '淮海中路320号', '上海', '8813900101');

-- pets (name, birth_date, type_id, owner_id)
-- types: 1=猫,2=狗,3=蜥蜴,4=蛇,5=鸟,6=仓鼠
-- owners ids: 按上面 owners 插入顺序 1..10
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('小虎', '2018-06-12', 2, 1);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('咪咪', '2020-11-03', 1, 2);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('豆豆', '2022-03-20', 6, 3);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('雪球', '2016-01-05', 1, 4);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('贝贝', '2019-09-18', 2, 5);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('小米', '2021-12-01', 6, 6);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('皮蛋', '2017-07-07', 5, 7);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('旺财', '2015-04-22', 2, 1);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('拉拉', '2023-02-14', 1, 8);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('毛球', '2014-10-30', 1, 9);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('奇奇', '2020-05-05', 6, 10);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('小黑', '2013-08-08', 2, 1);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('波波', '2019-01-20', 3, 3);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('糖糖', '2024-04-01', 1, 2);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('豆浆', '2012-12-12', 2, 4);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('奶酪', '2021-07-17', 6, 5);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('小绿', '2018-09-09', 4, 6);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('噜噜', '2016-11-11', 1, 2);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('点点', '2022-06-06', 6, 6);
INSERT INTO pets (name, birth_date, type_id, owner_id) VALUES ('布丁', '2017-03-03', 2, 3);

-- sample visits (pet_id, visit_date, description)
INSERT INTO visits (pet_id, visit_date, description) VALUES (1, '2023-01-10', '年度体检，疫苗更新');
INSERT INTO visits (pet_id, visit_date, description) VALUES (2, '2024-02-20', '皮肤过敏，给予外用药物');
INSERT INTO visits (pet_id, visit_date, description) VALUES (8, '2022-06-15', '牙齿清洁');
INSERT INTO visits (pet_id, visit_date, description) VALUES (13, '2021-09-01', '蜥蜴常规检查');

-- admin user (password为示例的 bcrypt 哈希，请替换为你自己的哈希/密码策略)
INSERT INTO users (username, password, enabled) VALUES ('admin', '$2a$10$ymaklWBnpBKlgdMgkjWVF.GMGyvH8aDuTK.glFOaKw712LHtRRymS', TRUE);

-- roles
INSERT INTO roles (username, role) VALUES ('admin', 'ROLE_OWNER_ADMIN');
INSERT INTO roles (username, role) VALUES ('admin', 'ROLE_VET_ADMIN');
INSERT INTO roles (username, role) VALUES ('admin', 'ROLE_ADMIN');

