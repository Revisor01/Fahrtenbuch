-- Setze Standardwerte aus ENV-Variablen
SET @default_erstattung_traeger = '0.30';
SET @default_erstattung_mitfahrer = '0.05';
SET @default_erstattung_datum = '2024-01-01';

USE fahrtenabrechnung;

-- Datenbank erstellen
CREATE DATABASE IF NOT EXISTS ${DB_NAME}
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ${DB_NAME};

-- Migrations-Tabelle
CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_migration_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users
CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','user') NOT NULL DEFAULT 'user',
    email_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(255) DEFAULT NULL,
    password_reset_token VARCHAR(255) DEFAULT NULL,
    password_reset_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY username (username),
    KEY idx_password_reset_token (password_reset_token),
    KEY idx_users_email_verified (email_verified),
    KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Profiles
CREATE TABLE user_profiles (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    full_name VARCHAR(255) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    kirchengemeinde VARCHAR(255) DEFAULT NULL,
    kirchspiel VARCHAR(255) DEFAULT NULL,
    kirchenkreis VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    CONSTRAINT user_profiles_ibfk_1 FOREIGN KEY (user_id) 
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orte
CREATE TABLE orte (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    ist_wohnort TINYINT(1) DEFAULT 0,
    ist_dienstort TINYINT(1) DEFAULT 0,
    ist_kirchspiel TINYINT(1) DEFAULT 0,
    usage_count INT DEFAULT 0,
    user_id INT DEFAULT NULL,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    KEY idx_orte_typ (ist_wohnort, ist_dienstort, ist_kirchspiel),
    KEY idx_orte_name (name),
    CONSTRAINT orte_ibfk_1 FOREIGN KEY (user_id) 
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Distanzen
CREATE TABLE distanzen (
    id INT NOT NULL AUTO_INCREMENT,
    von_ort_id INT DEFAULT NULL,
    nach_ort_id INT DEFAULT NULL,
    distanz INT NOT NULL,
    user_id INT DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_distanz (von_ort_id,nach_ort_id),
    KEY nach_ort_id (nach_ort_id),
    KEY user_id (user_id),
    CONSTRAINT distanzen_ibfk_1 FOREIGN KEY (von_ort_id) REFERENCES orte (id),
    CONSTRAINT distanzen_ibfk_2 FOREIGN KEY (nach_ort_id) REFERENCES orte (id),
    CONSTRAINT distanzen_ibfk_3 FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Abrechnungsträger
CREATE TABLE abrechnungstraeger (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY abrechnungstraeger_ibfk_1 (user_id),
    CONSTRAINT abrechnungstraeger_ibfk_1 FOREIGN KEY (user_id) 
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Erstattungsbeträge
CREATE TABLE erstattungsbetraege (
    id INT NOT NULL AUTO_INCREMENT,
    abrechnungstraeger_id INT NOT NULL,
    betrag DECIMAL(10,2) NOT NULL,
    gueltig_ab DATE NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY idx_traeger_datum (abrechnungstraeger_id,gueltig_ab),
    KEY idx_erstattung_gueltig (gueltig_ab),
    CONSTRAINT erstattungsbetraege_ibfk_1 FOREIGN KEY (abrechnungstraeger_id) 
    REFERENCES abrechnungstraeger (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mitfahrer Erstattung
CREATE TABLE mitfahrer_erstattung (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    betrag DECIMAL(10,2) NOT NULL,
    gueltig_ab DATE NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    CONSTRAINT mitfahrer_erstattung_ibfk_1 FOREIGN KEY (user_id) 
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fahrten
CREATE TABLE fahrten (
    id INT NOT NULL AUTO_INCREMENT,
    datum DATE NOT NULL,
    von_ort_id INT DEFAULT NULL,
    nach_ort_id INT DEFAULT NULL,
    anlass VARCHAR(255) NOT NULL,
    kilometer DECIMAL(10,2) DEFAULT NULL,
    abrechnung VARCHAR(50) DEFAULT NULL,
    user_id INT DEFAULT NULL,
    einmaliger_von_ort VARCHAR(255) DEFAULT NULL,
    einmaliger_nach_ort VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_fahrten_datum (datum),
    KEY idx_fahrten_user_id (user_id),
    KEY idx_fahrten_abrechnung (abrechnung),
    KEY idx_fahrten_datum_user (datum, user_id),
    KEY fk_von_ort (von_ort_id),
    KEY fk_nach_ort (nach_ort_id),
    CONSTRAINT fahrten_ibfk_1 FOREIGN KEY (von_ort_id) REFERENCES orte (id),
    CONSTRAINT fahrten_ibfk_2 FOREIGN KEY (nach_ort_id) REFERENCES orte (id),
    CONSTRAINT fahrten_ibfk_3 FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mitfahrer
CREATE TABLE mitfahrer (
    id INT NOT NULL AUTO_INCREMENT,
    fahrt_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    arbeitsstaette VARCHAR(255) NOT NULL,
    richtung ENUM('hin','rueck','hin_rueck') NOT NULL,
    PRIMARY KEY (id),
    KEY idx_mitfahrer_fahrt_id (fahrt_id),
    KEY idx_mitfahrer_name (name),
    CONSTRAINT mitfahrer_ibfk_1 FOREIGN KEY (fahrt_id) 
    REFERENCES fahrten (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Keys
CREATE TABLE api_keys (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    api_key VARCHAR(64) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_api_key (api_key),
    KEY user_id (user_id),
    KEY idx_api_keys_active (is_active),
    KEY idx_api_keys_last_used (last_used_at),
    CONSTRAINT api_keys_ibfk_1 FOREIGN KEY (user_id) 
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Abrechnungen
CREATE TABLE abrechnungen (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    jahr INT NOT NULL,
    monat INT NOT NULL,
    typ VARCHAR(50) NOT NULL,
    eingereicht_am DATE DEFAULT NULL,
    erhalten_am DATE DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_abrechnung (user_id,jahr,monat,typ),
    KEY idx_abrechnungen_status (eingereicht_am, erhalten_am),
    KEY idx_abrechnungen_jahr_monat (jahr, monat),
    CONSTRAINT abrechnungen_ibfk_1 FOREIGN KEY (user_id) 
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trigger für automatische Erstattungssätze
DELIMITER //

CREATE TRIGGER after_user_create 
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab)
    VALUES (NEW.id, @default_erstattung_mitfahrer, @default_erstattung_datum);
END//

CREATE TRIGGER after_abrechnungstraeger_create
AFTER INSERT ON abrechnungstraeger
FOR EACH ROW
BEGIN
    INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
    VALUES (NEW.id, @default_erstattung_traeger, @default_erstattung_datum);
END//

DELIMITER ;