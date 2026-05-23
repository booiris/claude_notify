# Claude Notify

Claude Code 完成任务后，通过本地 Web 页面播放提示音的通知工具。默认音效使用《魔兽争霸》Peon 语音。

## 功能

- Claude Code 任务结束时自动推送通知
- Web UI 支持解锁声音、调节音量、测试音效
- 使用 SSE 实时推送通知到浏览器
- 记录当前页面会话内的通知历史
- 多标签页场景下，优先只在一个标签页播放声音

## 工作流程

```text
Claude Code Hook
  -> notify.sh
  -> POST /notify
  -> server.js 广播 SSE
  -> 浏览器页面收到通知并播放音效
```

## 目录结构

```text
.
|-- install.sh          # 安装脚本，写入 Claude Code hooks
|-- notify.sh           # Hook 调用脚本，向本地服务发送通知
|-- server.js           # HTTP + SSE 服务
|-- public/             # Web UI
`-- sounds/             # 提示音文件
```

## 快速开始

```bash
git clone <repo-url> claude_notify
cd claude_notify

./install.sh
node server.js
```

然后在浏览器打开 `http://localhost:8888`，点击“解锁声音”一次。之后正常使用 Claude Code，任务完成时页面会播放提示音。

## install.sh 会做什么

安装脚本会：

- 检查 `node` 和 `curl`
- 给 `notify.sh` 添加执行权限
- 更新 `~/.claude/settings.json`
- 自动注册 `Stop` 和 `PermissionRequest` 两类 hooks

如果配置文件不存在，会自动创建；如果已存在相同 `notify.sh` hook，则跳过重复写入。

## 手动配置

如果不想运行安装脚本，可以手动配置。

1. 赋予执行权限：

```bash
chmod +x notify.sh
```

2. 编辑 `~/.claude/settings.json`，加入：

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/claude_notify/notify.sh"
          }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/claude_notify/notify.sh"
          }
        ]
      }
    ]
  }
}
```

3. 启动服务：

```bash
node server.js
```

4. 打开 `http://localhost:8888`，点击“解锁声音”。

## 配置

### 服务端口

server.js 端口的解析优先级：命令行参数 > `CLAUDE_NOTIFY_PORT` > `PORT` > 默认 `8888`。

```bash
node server.js 9999                      # 命令行参数
node server.js --port 9999               # 等价写法
CLAUDE_NOTIFY_PORT=9999 node server.js   # 环境变量
```

服务启动时会把实际端口写入同目录下的 `.notify-port` 文件，`notify.sh` 会自动读取它并连到相同端口，无需重复配置。

### notify.sh 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CLAUDE_NOTIFY_HOST` | `localhost` | 通知服务地址 |
| `CLAUDE_NOTIFY_PORT` | 见下 | 通知服务端口；显式设置后优先级最高 |

端口解析优先级：`CLAUDE_NOTIFY_PORT` > `.notify-port` 文件（由 server.js 写入）> `8888`。

因此一般只需在启动 server.js 时指定端口，notify.sh 会自动匹配：

```bash
node server.js 9999
./notify.sh "build finished"   # 自动使用 9999
```

如果 notify.sh 与 server.js 不在同一台机器上（读不到 `.notify-port`），用环境变量显式指定：

```bash
CLAUDE_NOTIFY_HOST=192.168.1.10 CLAUDE_NOTIFY_PORT=9999 ./notify.sh "build finished"
```

## 手动发送通知

```bash
./notify.sh "构建完成"
```

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, Peon!"}'
```

## API

| 路径 | 方法 | 说明 |
| --- | --- | --- |
| `/` | `GET` | Web UI |
| `/events` | `GET` | SSE 事件流 |
| `/notify` | `POST` | 发送通知，body: `{"message":"..."}` |
| `/status` | `GET` | 服务状态，返回连接中的客户端数量 |

## 注意事项

- 浏览器首次播放声音通常需要手动点击一次“解锁声音”
- 通知历史只保存在当前页面内存中，刷新后会清空
- 多标签页去重依赖 `navigator.locks`；如果浏览器不支持，多个标签页可能同时播放
- `notify.sh` 默认使用 `curl` 调本地服务，服务未启动时不会收到通知

## 依赖

- Node.js 14+
- curl
- 现代浏览器
- Python 3 可选，仅用于格式化 `notify.sh` 的 JSON 输出
