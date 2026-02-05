-- Tabla de polizas
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    policy_number VARCHAR(50) NOT NULL UNIQUE,
    customer VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('Property', 'Auto', 'Life', 'Health')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    premium_usd DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
    insured_value_usd DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_date_range CHECK (start_date < end_date)
);

-- Indices para busquedas frecuentes
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_policy_type ON policies(policy_type);
CREATE INDEX idx_policies_policy_number ON policies(policy_number);
CREATE INDEX idx_policies_customer ON policies(customer);

-- Tabla de operaciones para trazabilidad
CREATE TABLE IF NOT EXISTS operations (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    endpoint VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    correlation_id UUID NOT NULL,
    rows_inserted INTEGER DEFAULT 0,
    rows_rejected INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_summary TEXT
);

CREATE INDEX idx_operations_correlation_id ON operations(correlation_id);
CREATE INDEX idx_operations_created_at ON operations(created_at);
