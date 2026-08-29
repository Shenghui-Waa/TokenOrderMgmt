package com.shuye.tokenordermgmt.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import org.springframework.stereotype.Component;

@Data
@Component
@TableName("invoice_title")
public class InvoiceTitleEntity {

    @TableId(type = IdType.ASSIGN_UUID) private String id;

    @TableField("title_type") private String titleType;
    @TableField("name") private String name;
    @TableField("tax_code") private String taxCode;

    @TableField(value = "created_at", fill = FieldFill.INSERT) private String createdAt;
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE) private String updatedAt;

}
