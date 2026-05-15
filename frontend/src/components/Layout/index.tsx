import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Drawer, theme as antdTheme } from 'antd';
import {
  DashboardOutlined, UserOutlined, ShoppingOutlined,
  UploadOutlined, HistoryOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, WalletOutlined,
  BarChartOutlined, MoonOutlined, SunOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './index.css';

const { Header, Sider, Content } = AntLayout;

const adminMenuItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/admin/students', icon: <UserOutlined />, label: '学员管理' },
  { key: '/admin/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { key: '/admin/upload', icon: <UploadOutlined />, label: '文件上传' },
  { key: '/admin/batches', icon: <HistoryOutlined />, label: '导入历史' },
];

const studentMenuItems = [
  { key: '/student/dashboard', icon: <BarChartOutlined />, label: '我的看板' },
  { key: '/student/orders', icon: <ShoppingOutlined />, label: '我的订单' },
  { key: '/student/billing', icon: <WalletOutlined />, label: '我的账单' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme: currentTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = antdTheme.useToken();

  const isAdmin = user?.role === 'admin';
  const menuItems = isAdmin ? adminMenuItems : studentMenuItems;

  const handleMenuClick = (key: string) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || menuItems[0]?.key;

  const menuNode = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sider-logo">
        <h2 style={{ fontSize: collapsed ? 14 : 18, whiteSpace: 'nowrap' }}>
          {collapsed ? '物流' : '物流订单管理'}
        </h2>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{ flex: 1, borderRight: 0 }}
      />
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${themeToken.colorBorderSecondary}` }}>
        <div style={{ marginBottom: 8, fontSize: 12, color: themeToken.colorTextSecondary }}>
          {user?.name} ({isAdmin ? '管理员' : '学员'})
        </div>
        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} danger size="small" block>
          退出登录
        </Button>
      </div>
    </div>
  );

  return (
    <AntLayout className="app-layout" style={{ minHeight: '100vh' }}>
      <div className="desktop-sider">
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          breakpoint="lg"
          style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
        >
          {menuNode}
        </Sider>
      </div>

      <AntLayout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 16px',
          background: themeToken.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="desktop-trigger"
            />
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-trigger"
            />
            <span style={{ fontWeight: 600 }}>{menuItems.find(i => i.key === selectedKey)?.label}</span>
          </div>
          <Button
            type="text"
            icon={currentTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{ marginLeft: 'auto' }}
            title={currentTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          />
        </Header>

        <Content style={{ margin: 16, minHeight: 280 }}>
          <Outlet />
        </Content>
      </AntLayout>

      <Drawer
        placement="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size={240}
        styles={{ body: { padding: 0 } }}
      >
        {menuNode}
      </Drawer>
    </AntLayout>
  );
}