#!/bin/bash

# 服务器更新脚本 - Unsplash署名功能
# 用途：将Unsplash署名功能部署到生产服务器
# 使用方法：在服务器上执行此脚本

set -e  # 遇到错误立即退出

echo "========================================="
echo "  部署Unsplash署名功能到生产服务器"
echo "========================================="
echo ""

# 配置变量
SERVER_DIR="/root/闪阅/server"
BACKUP_DIR="/root/闪阅/server_backup_$(date +%Y%m%d_%H%M%S)"
PM2_APP_NAME="shanyue-backend"

# 检查是否在服务器上
if [ ! -d "$SERVER_DIR" ]; then
    echo "❌ 错误：找不到服务器目录 $SERVER_DIR"
    echo "请确保在正确的服务器上执行此脚本"
    exit 1
fi

# 1. 备份当前代码
echo "📦 步骤1：备份当前代码..."
cp -r "$SERVER_DIR" "$BACKUP_DIR"
echo "✅ 备份完成：$BACKUP_DIR"
echo ""

# 2. 备份需要更新的文件
echo "📝 步骤2：备份需要更新的文件..."
cd "$SERVER_DIR"
cp unsplash-fetcher-simple.js unsplash-fetcher-simple.js.bak
cp article-generator.js article-generator.js.bak
cp frontend/admin.html frontend/admin.html.bak
echo "✅ 文件备份完成"
echo ""

# 3. 提示手动更新文件
echo "⚠️  步骤3：需要手动更新以下文件"
echo ""
echo "请从GitHub下载最新代码并替换以下文件："
echo "  1. unsplash-fetcher-simple.js"
echo "  2. article-generator.js"
echo "  3. frontend/admin.html"
echo ""
echo "GitHub仓库：https://github.com/xutomi3-art/tongyong-web-backend"
echo ""
echo "或者使用以下命令从GitHub拉取："
echo "  cd $SERVER_DIR"
echo "  git init"
echo "  git remote add origin https://github.com/xutomi3-art/tongyong-web-backend.git"
echo "  git fetch origin main"
echo "  git checkout origin/main -- unsplash-fetcher-simple.js"
echo "  git checkout origin/main -- article-generator.js"
echo "  git checkout origin/main -- frontend/admin.html"
echo ""

read -p "文件已更新？按Enter继续，或Ctrl+C取消... " confirm

# 4. 验证文件是否包含新功能
echo "🔍 步骤4：验证文件更新..."

if grep -q "utm_source=shanyue_ai" unsplash-fetcher-simple.js; then
    echo "✅ unsplash-fetcher-simple.js 包含UTM参数"
else
    echo "❌ 警告：unsplash-fetcher-simple.js 可能未正确更新"
fi

if grep -q "imageAuthor" article-generator.js; then
    echo "✅ article-generator.js 包含署名字段"
else
    echo "❌ 警告：article-generator.js 可能未正确更新"
fi

if grep -q "imageSource === 'unsplash'" frontend/admin.html; then
    echo "✅ frontend/admin.html 包含署名显示逻辑"
else
    echo "❌ 警告：frontend/admin.html 可能未正确更新"
fi

echo ""

# 5. 重启PM2服务
echo "🔄 步骤5：重启PM2服务..."
pm2 restart "$PM2_APP_NAME" || pm2 restart all
echo "✅ 服务重启完成"
echo ""

# 6. 检查服务状态
echo "📊 步骤6：检查服务状态..."
pm2 status
echo ""

# 7. 查看最新日志
echo "📋 步骤7：查看最新日志..."
pm2 logs "$PM2_APP_NAME" --lines 20 --nostream
echo ""

# 8. 完成
echo "========================================="
echo "  ✅ 部署完成！"
echo "========================================="
echo ""
echo "下一步："
echo "  1. 访问管理后台：https://shanyue.jotoai.com/admin/admin.html"
echo "  2. 切换到\"文章管理\"Tab"
echo "  3. 生成一篇新文章测试Unsplash署名功能"
echo "  4. 验证图片下方是否显示：Photo by [摄影师名] on Unsplash"
echo ""
echo "如果遇到问题："
echo "  - 查看日志：pm2 logs $PM2_APP_NAME"
echo "  - 恢复备份：cp -r $BACKUP_DIR/* $SERVER_DIR/ && pm2 restart $PM2_APP_NAME"
echo ""
