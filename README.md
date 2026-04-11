# 🔨 Claude Notify

Claude Code 任务完成声音通知工具。当 Claude 完成任务时，自动播放魔兽争霸农民（Peon）语音提醒你。

> *"Work, work."* — Peon

## 功能

- 🔊 Claude 完成任务后自动播放声音通知
- 🎮 魔兽争霸 Peon 经典语音（"Work, work"、"Okie dokie" 等）
- 🌐 Web UI 界面，支持音量调节、音效预览、通知历史
- 🔇 多标签页自动去重，同时只在一个标签页播放声音
- ⚡ 基于 SSE（Server-Sent Events），实时推送

## 工作原理

```
Claude Code 完成任务
       ↓
Notification Hook 触发
       ↓
notify.sh → POST /notify → Server
       ↓
Server 通过 SSE 广播到所有浏览器客户端
       ↓
浏览器播放 Peon 语音 🔊
```

## 快速开始

```bash
# 克隆仓库
git clone <repo-url> claude_notify
cd claude_notify

# 运行安装脚本（检查依赖 + 配置 Claude Code Hook）
./install.sh

# 启动通知服务器
node server.js

# 在浏览器中打开 http://localhost:8888，点击「解锁声音」
```

保持浏览器标签页打开，然后正常使用 Claude Code。任务完成时你会听到 Peon 的声音！

## 手动安装

如果不想使用安装脚本，可以手动配置：

1. 确保 `notify.sh` 有执行权限：

```bash
chmod +x notify.sh
```

2. 编辑 `~/.claude/settings.json`，添加 Notification Hook：

```json
{
  "hooks": {
    "Notification": [
      {
        "command": "/absolute/path/to/claude_notify/notify.sh"
      }
    ]
  }
}
```

> 如果文件中已有其他配置，将 `hooks.Notification` 数组合并进去即可。

3. 启动服务器：`node server.js`

4. 浏览器打开 `http://localhost:8888`，点击「解锁声音」。

## 配置

### 服务器端口

```bash
PORT=9999 node server.js
```

### notify.sh 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CLAUDE_NOTIFY_HOST` | `localhost` | 通知服务器地址 |
| `CLAUDE_NOTIFY_PORT` | `8888` | 通知服务器端口 |

修改端口时，服务器和 notify.sh 两侧都需要对应修改：

```bash
PORT=9999 node server.js                          # 服务器监听 9999
CLAUDE_NOTIFY_PORT=9999 ./notify.sh "hello"       # 客户端发送到 9999
```

### 手动发送通知

```bash
# 通过 notify.sh
./notify.sh "构建完成！"

# 通过 curl
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, Peon!"}'
```

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | Web UI 页面 |
| `/events` | GET | SSE 事件流（浏览器订阅） |
| `/notify` | POST | 发送通知，body: `{"message": "..."}` |
| `/status` | GET | 服务器状态 `{"ok": true, "clients": N}` |

## 卸载

1. 编辑 `~/.claude/settings.json`，删除 `hooks.Notification` 中包含 `notify.sh` 的条目
2. 停止服务器（Ctrl+C）
3. 删除项目目录

## 依赖

- [Node.js](https://nodejs.org) >= 14
- curl
- 现代浏览器（Chrome / Firefox / Edge / Safari）

## 致谢

- Peon 语音素材来自 [PeonPing/peon-ping](https://github.com/PeonPing/peon-ping)
