package com.shuye.tokenordermgmt.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Data
@Component
@TableName("provider")
public class ProviderEntity {

    @TableId(type = IdType.ASSIGN_UUID) private String id;

    @TableField("name") private String name;
    @TableField("website") private String website;

    @TableField(value = "created_at", fill = FieldFill.INSERT) private LocalDateTime createdAt;
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE) private LocalDateTime updatedAt;
}
