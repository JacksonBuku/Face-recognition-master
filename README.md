# Face Recognition（人脸识别）

一个简单易用的人脸识别库，支持：

- 在图片中检测人脸位置
- 提取人脸关键点（眼睛、鼻子、嘴巴等）
- 生成人脸特征向量并进行身份比对
- 通过命令行批量处理图片

本项目基于 `dlib` 深度学习模型封装，适合做教学、原型验证和中小型人脸识别任务。

## 功能概览

- **人脸检测**：获取图片中每张人脸的坐标
- **人脸关键点**：获取五官轮廓点位
- **人脸编码**：将人脸转换成可比较的数值特征
- **人脸比对**：判断两张人脸是否为同一人
- **CLI 工具**：`face_recognition`、`face_detection`

## 环境要求

- Python 3（推荐 3.8+）
- `dlib` 及其编译依赖（Windows 下请优先使用已编译环境或 Conda）

项目依赖见 `requirements.txt`：

- `face_recognition_models`
- `Click>=6.0`
- `dlib>=19.3.0`
- `numpy`
- `Pillow`
- `scipy>=0.17.0`
- `Flask`
- `flask-cors`

## 安装

### 1) 创建虚拟环境（推荐）

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 2) 安装依赖

```bash
pip install -r requirements.txt
```

> 如果 `dlib` 安装失败，优先检查 C++ 编译工具链、CMake 以及 Python/平台兼容性。

## 快速开始（Python）

### 1) 检测图片中的人脸

```python
import face_recognition

image = face_recognition.load_image_file("your_file.jpg")
face_locations = face_recognition.face_locations(image)
print(face_locations)
```

### 2) 提取人脸关键点

```python
import face_recognition

image = face_recognition.load_image_file("your_file.jpg")
landmarks = face_recognition.face_landmarks(image)
print(landmarks)
```

### 3) 比对两张人脸是否同一人

```python
import face_recognition

known_image = face_recognition.load_image_file("known.jpg")
unknown_image = face_recognition.load_image_file("unknown.jpg")

known_encoding = face_recognition.face_encodings(known_image)[0]
unknown_encoding = face_recognition.face_encodings(unknown_image)[0]

result = face_recognition.compare_faces([known_encoding], unknown_encoding)[0]
print("同一人" if result else "不同人")
```

## 命令行使用

安装完成后可使用两个命令：

- `face_recognition`：识别人脸身份
- `face_detection`：检测人脸坐标

### 1) 识别人脸身份

```bash
face_recognition ./known_people/ ./unknown_images/
```

输出格式示例：

```text
unknown_images/test1.jpg,Tom
unknown_images/test2.jpg,unknown_person
```

### 2) 检测人脸坐标

```bash
face_detection ./images/
```

输出格式为：

```text
图片路径,top,right,bottom,left
```

### 3) 常用参数

```bash
face_recognition --tolerance 0.54 ./known_people/ ./unknown_images/
face_recognition --show-distance true ./known_people/ ./unknown_images/
face_recognition --cpus -1 ./known_people/ ./unknown_images/
```

- `--tolerance`：越小越严格，默认 `0.6`
- `--show-distance`：显示人脸距离值，便于调阈值
- `--cpus`：并行处理，`-1` 表示使用全部 CPU 核心

## 目录说明

```text
face_recognition-master/
├─ face_recognition/
│  ├─ api.py
│  ├─ face_recognition_cli.py
│  └─ face_detection_cli.py
├─ docs/
├─ requirements.txt
└─ README.md
```

## 常见问题

### 1) Windows 安装困难（尤其是 dlib）

- 建议使用 Conda 环境
- 确保已安装 Visual Studio C++ Build Tools
- Python 版本尽量使用社区验证较多的版本（如 3.8-3.11）

### 2) 识别准确率不稳定

- 统一图片清晰度、光照与角度
- 适当调小 `--tolerance`
- 使用多张已知人脸样本构建特征库

### 3) 速度较慢

- 启用并行参数 `--cpus`
- 降低输入图片分辨率
- 有 GPU 场景下可尝试深度学习检测模型（需 CUDA 支持）

## 参考文档

- 官方 API 文档：<https://face-recognition.readthedocs.io/en/latest/face_recognition.html>
- 项目主页：<https://github.com/ageitgey/face_recognition>

## 许可证

本项目遵循仓库中的 `LICENSE` 文件。
