package com.shuye.tokenordermgmt.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Data
@Component
@TableName("token_order")
public class TokenOrderEntity {

    @TableId(type = IdType.ASSIGN_UUID) private String id;

    @TableField("order_no") private String orderNo;
    @TableField("amount_cent") private Long amountCent;
    @TableField("payment_type") private String paymentType;

    @TableField("provider_id") private String providerId;

    @TableField("invoice_id") private String invoiceId;

    @TableField(value = "created_at", fill = FieldFill.INSERT) private LocalDateTime createdAt;
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE) private LocalDateTime updatedAt;

    @TableField("deleted_at") private LocalDateTime deletedAt;

}
