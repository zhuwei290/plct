# 任务一 ：x86_64下使用容器（Docker）完成openGauss Risc-V的编译和部署工作

## openGauss RISC-V 简介

openGauss RISC-V 是基于 openGauss 数据库系统，为国产开源指令集架构 RISC-V 平台适配和优化的版本。该版本致力于推动 openGauss 在多架构场景下的兼容性，完善国产软硬件协同生态，为自主可控数据库方案提供底层支撑。

openGauss是一款提供面向多核的极致性能、全链路的业务和数据安全，基于AI的调优和高效运维的能力，全面友好开放，携手伙伴共同打造全球领先的企业级开源关系型数据库，采用木兰宽松许可证v2发行。openGauss深度融合华为在数据库领域多年的研发经验，结合企业级场景需求，持续构建竞争力特性。

- #### 为什么要使用 openGauss RISC-V

  openGauss是一款支持SQL2003标准语法，支持主备部署的高可用关系型数据库。
  多种存储模式支持复合业务场景，新引入提供原地更新存储引擎。
  NUMA化数据结构支持高性能。
  Paxos一致性日志复制协议，主备模式，CRC校验支持高可用。
  支持全密态计算、账本数据库等安全特性，提供全方位端到端的数据安全保护。
  通过Table Access Method接口层支持多存储引擎。



## 一、操作步骤

### 环境要求

- #### git

  

- #### docker

  

- #### qemu
#### 应确保qemu-riscv64-static在命令行中可用。
##### 在ArchLinux中，确保包qemu-system-riscv、qemu-user-static已经安装
##### 在Debian中，确保包qemu-system-riscv、qemu-user-static已经安装（该包需要 Debian 13 Trixie）
-----



###  第零步 配置QEMU

> 对于直接使用riscv64架构的机器作为容器宿主机的用户，应考虑跳转至第一步

运行下述命令行以使用`multiarch/qemu-user-static`：

```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes 
```


### 第一步 容器配置

我们首先需要将openGauss Risc-V的代码克隆到本地：

```bash
git clone https://gitee.com/opengauss/riscv
```

接着我们需要通过Docker构建一个用于编译该仓库中代码的容器：

```bash
cd riscv # 切换到目标代码仓库的目录
sudo docker run -it \
  --name opengauss \
  -p 5432:5432 \
  -v /home/hadoop/openGauss-embedded:/root/rpmbuild/SOURCES \
  opengauss
#启动容器环境并做目录挂载(方便传文件)和端口映射(为了方便远程连接数据库)
```
![img](.\img\QQ图片20250723212510.png) 

以上指令构建了一个名为`opengauss`的容器，该容器以交互模式运行（`-i`），并开启了伪终端（`-t`）。该容器将当前目录（`$(pwd)`）挂载到容器中的`/root/rpmbuild/SOURCES`路径。

如若容器启动时，遇到报错：
```
exec /usr/bin/uname: exec format error
libcontainer: container start initialization failed: exec /usr/bin/uname: exec format error
```
则应重试上述第零步。并在删除容器`opengauss`后重新进行本步骤。

如若拉取容器失败
```
Error response from daemon: Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
```
则应修改创建或编辑 /etc/docker/daemon.json 配置文件：
```
{

 "registry-mirrors": [
   	 "https://kr3cgcc9.mirror.aliyuncs.com",
    	"https://docker.rainbond.cc",
    	"https://do.nark.eu.org",
    	"https://dc.j8.work",
    	"https://docker.m.daocloud.io",
    	"https://dockerproxy.com",
    	"https://registry.docker-cn.com",
    	"https://docker.mirrors.ustc.edu.cn",
    	"https://hub-mirror.c.163.com",
   	 "https://mirror.baidubce.com",
    	"https://docker.nju.edu.cn",
	"https://docker.1ms.run",
	"https://docker.xuanyuan.me",
	"https://dislabaiot.xyz",
	"https://hub.rat.dev",
	"https://doublezonline.cloud",
	"https://dislabaiot.xyz",
	"https://xdark.top"
  ]
}
```
### 第二步 使用伪终端编译rpm文件


如若在执行第一步的指令时，未能进入到容器中。可以通过下述指令进入到容器中：
```bash
docker exec -it opengauss /bin/bash
```
![img](.\img\QQ图片20250723215458.png) 

通过下述指令在容器中配置环境：
```bash
cd /root/rpmbuild/SOURCES

# 安装必要工具
dnf install -y rpm-build rpmdevtools dnf-plugins-core
# 安装编译依赖
yum-builddep -y opengauss-server.spec
# 下载源码
spectool -g opengauss-server.spec
```
![img](.\img\QQ截图20250723220023.png) 

通过下述指令编译RPM包：
```bash
cd /root/rpmbuild/SOURCES
rpmbuild -ba opengauss-server.spec
```
![img](.\img\QQ截图20250723220234.png) 



编译得到的文件在路径`/root/rpmbuild/RPMS/riscv64/`下

### 第三步 安装rpm文件

使用下述指令安装编译得到的RPM文件：
```bash
cd /root/rpmbuild/RPMS/riscv64/
dnf install -y $(ls *.rpm)
```
![img](.\img\QQ截图20250723220501.png) 

### 第四步 在容器中运行数据库

测试数据库是否正确安装并不需要运行数据库。仅运行`test/test.sh`的用户可以跳转到下文第五步。

由于容器并没有init进程，所以不能使用`systemctl start`的方式启动数据库服务。

注意到，openGauss的安装位置在容器中的`/opt/opengauss`目录下。我们可以手动运行openGauss的脚本来模拟生产环境中服务启动的过程。

```bash
su opengauss # 切换到opengauss账户。该账户的home目录为/var/lib/opengauss
/opt/opengauss/init-opengaussdb.sh # 数据库初始化脚本
/opt/opengauss/bin/gaussdb -D /var/lib/opengauss/data --single_node #以单节点模式运行openGauss数据库
```
![img](.\img\QQ截图20250723220610.png) 
### 第五步 运行数据库
#### 创建数据库和用户

```bash
# 切换至 opengauss 用户
su opengauss

# 连接数据库
opt/opengauss/bin/gsql -d postgres
```
![img](.\img\QQ截图20250723221739.png) 
当gsql连接数据库成功后，在gsql交互界面中输入

```sql
alter role "opengauss" password "openGauss@2024"; -- 修改默认用户密码
create user xiaofan identified by 'xiaofan@2024' profile default;  -- 创建用户 xiaofan
alter user xiaofan sysadmin;
create database xfdb encoding 'UTF8' template=template0 owner xiaofan; -- 创建数据库 
```
![img](.\img\QQ截图20250723221930.png) 
以上执行成功后，按`Ctrl+D`退出界面。接下来设置远程登录



### 配置远程登录

```bash
vim /var/lib/opengauss/data/postgresql.conf
# 配置 listen_addresses = '*'
vim /var/lib/opengauss/data/pg_hba.conf
# 末尾增加 host     all            xiaofan         0.0.0.0/0               sha256

gs_ctl -D $HOME/data reload
# reload后即可生效
```
![img](.\img\QQ截图20250723222156.png) 
### 本地测试

使用 `gsql -U xiaofan -d xfdb` 连接数据库，创建表，并作简单的增删查操作

```sql
create table phonebook (
    id serial primary key,
    name varchar(20),
    phone varchar(20)
);

insert into phonebook (name, phone) values ('工商银行', '95588');
insert into phonebook (name, phone) values ('招商银行', '95555');
insert into phonebook (name, phone) values ('农业银行', '95599');

insert into phonebook (name, phone) values ('邮政快递', '11183');
insert into phonebook (name, phone) values ('顺丰快递', '95338');
insert into phonebook (name, phone) values ('京东物流', '95311');

select * from phonebook where name like '%银行';
select count(*) from phonebook;
delete from phonebook where name = '农业银行';
select * from phonebook;

```
![img](.\img\QQ截图20250723222305.png) 
### 远程测试

远程可以使用 dbeaver 连接数据库，连接时使用 xiaofan/xiaofan@2024 连接即可

注意：使用dbeaver可能需要手动设置openGauss的数据库驱动，可以从 [openGauss-5.0.3-JDBC.tar.gz](https://opengauss.obs.cn-south-1.myhuaweicloud.com/5.0.3/arm_2203/openGauss-5.0.3-JDBC.tar.gz) 获得

![img](.\img\QQ截图20250723222810.png) 


### 运行数据库测试脚本
在root用户下，输入下述指令启动测试脚本：
```bash
/root/rpmbuild/SOURCES/test/test.sh
```

该数据库测试脚本需要数据库没有被创建。如若您已经运行上述第四步中的`init-opengaussdb.sh`脚本进行了数据库的初始化，那么请运行下述指令：

```bash
mv /var/lib/opengauss/data{,.bak}
```
该指令将`/var/lib/opengauss/data`文件夹重命名为`data.bak`。

若您需要**删除当前设备上已经创建的数据库**，那么请运行下述指令：

```
rm -rf /var/lib/opengauss/data
```


---
# 任务二 ：在Risc-V环境中源码编译和运行openGauss-embedded 

## 一、openGauss-embedded 简介
openGauss-embedded 是基于 openGauss 数据库内核深度裁剪和轻量化改造的 嵌入式数据库版本，旨在满足 IoT、边缘计算、智能终端等对资源占用敏感、部署灵活性要求高的场景。它保留了 openGauss 在事务处理、SQL 支持和数据一致性等核心能力的同时，大幅降低运行时资源消耗，支持在多种嵌入式操作系统和国产化平台上运行。

## 核心特性：
✅ 轻量级架构：移除重型依赖，精简内核，显著减少可执行体积与内存占用

✅ 嵌入式部署支持：可集成于其他系统组件中运行，支持动态链接与静态编译

✅ 跨平台兼容性：适配多种 CPU 架构（x86_64、ARM、RISC-V），兼容主流嵌入式 Linux 系统

✅ 快速启动与低功耗运行：优化初始化流程，提升冷启动速度

✅ 数据库核心能力保留：支持标准 SQL 查询、事务隔离、数据一致性保障

✅ 丰富的构建配置选项：支持 release_lite、test_lite 等构建目标，可灵活集成测试、调试或裁剪功能

## 二、编译指导
##### 1、操作系统和软件依赖要求

操作系统：

-   riscv64 


编译工具：
-   GCC >= 7.3
-   CMAKE >= 3.15
-   jdk11

##### 2、拉取源码并进入目录
```
git clone https://gitee.com/opengauss/openGauss-embedded.git
cd openGauss-embedded
```


#### 修改多个c文件源码
具体修改差异： [RISC-V-openGauss-embedded.patch](.\RISC-V-openGauss-embedded.patch)


##### 3、在类UNIX系统编译


- make release_lite OS_ARCH=riscv64 : 编译生成<span style="color: red;">轻量化</span>release

![img](.\img\QQ截图20250723224826.png) 






#### 三、运行指导

编译完成后，会在工程目录下生成output目录，当前生成两个测试demo提供对嵌入式数据库的测试。

```
output目录结构如下：
├── debug   # 使用make/make debug/make test编译时debug版本存储引擎和SQL引擎的可执行文件和库文件保存路径
│   ├── bin # debug版本可执行文件保存路径
│   └── lib # debug版本库文件保存路径
├── inc     # 第三方库文件的头文件保存路径，同以前
│   ├── cJSON
│   ├── huawei_security
│   ├── libpg_query
│   ├── libutf8proc
│   ├── zlib
│   └── fmt 
└── release  # 使用make release 编译时release版本存储引擎和SQL引擎的可执行文件和库文件保存路径
    ├── bin  # release版本可执行文件保存路径
    └── lib  # release版本库文件保存路径
```
---
1.进入生成目录

```
cd output/release_lite/bin
```
---

2.测试sql脚本

```
./intarkdb_cli test < basic_test.sql
```
![img](.\img\QQ截图20250723225349.png) 

## 最终结论
✅ RISC-V适配成功  
✅ sql功能验证通过  
