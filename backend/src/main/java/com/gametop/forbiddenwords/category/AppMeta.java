package com.gametop.forbiddenwords.category;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** ค่าระบบแบบ key-value — ใช้จำว่านำเข้าข้อมูลเวอร์ชันไหนไปแล้ว */
@Entity
@Table(name = "app_meta")
public class AppMeta {

    @Id
    @Column(name = "meta_key", length = 50)
    private String key;

    @Column(name = "meta_value", nullable = false, length = 200)
    private String value;

    protected AppMeta() {
    }

    public AppMeta(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey() {
        return key;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
