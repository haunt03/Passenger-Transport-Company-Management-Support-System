package org.example.ptcmssbackend.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.example.ptcmssbackend.enums.ValueType;

@Converter(autoApply = true)
public class ValueTypeConverter implements AttributeConverter<ValueType, String> {

    @Override
    public String convertToDatabaseColumn(ValueType attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.getDbValue();
    }

    @Override
    public ValueType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return null;
        }
        return ValueType.fromDbValue(dbData);
    }
}
