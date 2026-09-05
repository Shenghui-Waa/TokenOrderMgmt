package com.shuye.tokenordermgmt.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Component
@TableName("invoice")
public class InvoiceEntity {

    @TableId(type = IdType.ASSIGN_UUID) private String id;

    @TableField("invoice_no") private String invoiceNo;
    @TableField("total_amount_cent") private Long totalAmountCent;
    @TableField("invoice_date") private LocalDate invoiceDate;

    @TableField("invoice_title_id") private String invoiceTitleId;

    @TableField("status") private String status;

    @TableField(value = "created_at", fill = FieldFill.INSERT) private LocalDateTime createdAt;
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE) private LocalDateTime updatedAt;

}
