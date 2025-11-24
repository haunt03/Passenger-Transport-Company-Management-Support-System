package org.example.ptcmssbackend.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.example.ptcmssbackend.enums.InvoiceType;

@Converter(autoApply = false)
public class InvoiceTypeConverter implements AttributeConverter<InvoiceType, String> {
    @Override
    public String convertToDatabaseColumn(InvoiceType attribute) {
        return attribute != null ? attribute.name() : null;
    }

    @Override
    public InvoiceType convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        String normalized = dbData.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return InvoiceType.valueOf(normalized.toUpperCase());
    }
}