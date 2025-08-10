import { User, CreateUserReq, UpdateUserReq } from '@/common/ipc';

// 模拟数据存储
let users: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'user',
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  },
];

let nextUserId = 3;

export const userService = {
  /**
   * 根据 ID 获取用户
   */
  async getById(id: string): Promise<User | null> {
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return users.find(user => user.id === id) || null;
  },

  /**
   * 获取所有用户
   */
  async getAll(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return [...users];
  },

  /**
   * 创建新用户
   */
  async create(userData: CreateUserReq): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newUser: User = {
      id: String(nextUserId++),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    users.push(newUser);
    return newUser;
  },

  /**
   * 更新用户信息
   */
  async update(userData: UpdateUserReq): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const userIndex = users.findIndex(user => user.id === userData.id);
    if (userIndex === -1) {
      return null;
    }
    
    const updatedUser: User = {
      ...users[userIndex],
      ...userData,
      updatedAt: new Date(),
    };
    
    users[userIndex] = updatedUser;
    return updatedUser;
  },

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return false;
    }
    
    users.splice(userIndex, 1);
    return true;
  },

  /**
   * 检查邮箱是否已存在
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return users.some(user => user.email === email && user.id !== excludeId);
  },
};
