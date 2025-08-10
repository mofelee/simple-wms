import React, { useState, useEffect, useRef } from 'react';
import { User, CreateUserReq, UpdateUserReq } from '../common/ipc';

interface UserDemoProps {
  onLog: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const UserDemo: React.FC<UserDemoProps> = ({ onLog }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserReq>({
    name: '',
    email: '',
    role: 'user'
  });
  const [editMode, setEditMode] = useState(false);
  
  // 使用 ref 来存储 onLog 函数，避免依赖变化
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.user.getAll();
      if (response.success && response.data) {
        setUsers(response.data);
        onLog('用户列表加载成功', 'success');
      } else {
        onLog(`加载用户列表失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`加载用户列表失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 获取单个用户
  const getUser = async (id: string) => {
    try {
      const response = await window.electronAPI.user.getById(id);
      if (response.success && response.data) {
        setSelectedUser(response.data);
        onLog(`获取用户 ${response.data.name} 成功`, 'success');
      } else {
        onLog(`获取用户失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`获取用户失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 创建用户
  const createUser = async () => {
    if (!formData.name || !formData.email) {
      onLog('请填写完整的用户信息', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await window.electronAPI.user.create(formData);
      if (response.success && response.data) {
        onLog(`用户 ${response.data.name} 创建成功`, 'success');
        setFormData({ name: '', email: '', role: 'user' });
        loadUsers();
      } else {
        onLog(`创建用户失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`创建用户失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 更新用户
  const updateUser = async () => {
    if (!selectedUser || !formData.name || !formData.email) {
      onLog('请填写完整的用户信息', 'error');
      return;
    }

    setLoading(true);
    try {
      const updateData: UpdateUserReq = {
        id: selectedUser.id,
        ...formData
      };
      const response = await window.electronAPI.user.update(updateData);
      if (response.success && response.data) {
        onLog(`用户 ${response.data.name} 更新成功`, 'success');
        setEditMode(false);
        setSelectedUser(null);
        setFormData({ name: '', email: '', role: 'user' });
        loadUsers();
      } else {
        onLog(`更新用户失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`更新用户失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 删除用户
  const deleteUser = async (id: string) => {
    if (!confirm('确定要删除这个用户吗？')) {
      return;
    }

    setLoading(true);
    try {
      const response = await window.electronAPI.user.delete(id);
      if (response.success) {
        onLog('用户删除成功', 'success');
        loadUsers();
      } else {
        onLog(`删除用户失败: ${response.error}`, 'error');
      }
    } catch (error) {
      onLog(`删除用户失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 编辑用户
  const editUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
    setEditMode(true);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditMode(false);
    setSelectedUser(null);
    setFormData({ name: '', email: '', role: 'user' });
  };

  // 监听用户事件
  useEffect(() => {
    const unsubscribeCreated = window.electronAPI.user.onCreated((user) => {
      onLogRef.current(`收到用户创建事件: ${user.name}`, 'info');
    });

    const unsubscribeUpdated = window.electronAPI.user.onUpdated((user) => {
      onLogRef.current(`收到用户更新事件: ${user.name}`, 'info');
    });

    const unsubscribeDeleted = window.electronAPI.user.onDeleted((data) => {
      onLogRef.current(`收到用户删除事件: ID ${data.id}`, 'info');
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, []); // 移除 onLog 依赖

  // 初始加载
  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">用户管理演示</h2>
        <button 
          onClick={loadUsers}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {/* 用户表单 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">
          {editMode ? '编辑用户' : '创建用户'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="姓名"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="邮箱"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="user">用户</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div className="mt-4 space-x-2">
          <button
            onClick={editMode ? updateUser : createUser}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '处理中...' : (editMode ? '更新' : '创建')}
          </button>
          {editMode && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              取消
            </button>
          )}
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">用户列表</h3>
        {users.length === 0 ? (
          <p className="text-gray-500">暂无用户</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">姓名</th>
                  <th className="px-4 py-2 text-left">邮箱</th>
                  <th className="px-4 py-2 text-left">角色</th>
                  <th className="px-4 py-2 text-left">创建时间</th>
                  <th className="px-4 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-2">{user.id}</td>
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => getUser(user.id)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => editUser(user)}
                        className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 选中用户详情 */}
      {selectedUser && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">用户详情</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>ID:</strong> {selectedUser.id}
            </div>
            <div>
              <strong>姓名:</strong> {selectedUser.name}
            </div>
            <div>
              <strong>邮箱:</strong> {selectedUser.email}
            </div>
            <div>
              <strong>角色:</strong> {selectedUser.role === 'admin' ? '管理员' : '用户'}
            </div>
            <div>
              <strong>创建时间:</strong> {new Date(selectedUser.createdAt).toLocaleString()}
            </div>
            <div>
              <strong>更新时间:</strong> {new Date(selectedUser.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDemo;
