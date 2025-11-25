package org.example.ptcmssbackend.enums;

public enum ValueType {
    STRING("string"),
    INT("int"),
    DECIMAL("decimal"),
    BOOLEAN("boolean"),
    JSON("json");

    private final String dbValue;

    ValueType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    // Convert from database value to enum
    public static ValueType fromDbValue(String dbValue) {
        for (ValueType type : ValueType.values()) {
            if (type.dbValue.equals(dbValue)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown database value: " + dbValue);
    }
}
