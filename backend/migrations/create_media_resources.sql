CREATE TABLE media_resources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  storage_type ENUM('ros', 'local') DEFAULT 'ros',
  storage_key VARCHAR(500),
  storage_url VARCHAR(500) NOT NULL,
  source ENUM('user_upload', 'ai_generated') DEFAULT 'user_upload',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_source (source),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);