import { useState } from 'react';
import { Card, Upload, Button, Table, Modal, Tag, message, Space, Select, Alert, Checkbox } from 'antd';
import { InboxOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { uploadErp, confirmErp, uploadLogistics, confirmLogistics } from '../../../api/upload';

const { Dragger } = Upload;

export default function UploadPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
      <ErpUpload />
      <LogisticsUpload />
    </div>
  );
}

function ErpUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<string, string>>({});
  const [showDupModal, setShowDupModal] = useState(false);
  const [confirmedStudents, setConfirmedStudents] = useState<string[]>([]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadErp(file);
      setPreview(res);
      setConfirmedStudents(res.new_students?.map((s: any) => s.name) || []);
      if (res.duplicates?.length > 0) setShowDupModal(true);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const res = await confirmErp({
        duplicate_decisions: duplicateDecisions,
        confirmed_students: confirmedStudents,
        rows_to_import: preview.preview,
      });
      message.success(`导入成功: ${res.success_rows} 条, 跳过: ${res.skip_rows} 条, 新学员: ${res.new_students} 人`);
      setPreview(null);
      setFile(null);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '确认导入失败');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card title="ERP 文件上传" bordered={false}>
      <Dragger
        beforeUpload={(f) => { setFile(f); return false; }}
        maxCount={1}
        onRemove={() => { setFile(null); setPreview(null); }}
        accept=".xlsx"
        disabled={loading}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽 ERP 导出文件到此区域</p>
        <p className="ant-upload-hint">支持 .xlsx 格式</p>
      </Dragger>
      <Button
        type="primary"
        onClick={handleUpload}
        loading={loading}
        disabled={!file}
        block
        style={{ marginTop: 12 }}
        icon={<CloudUploadOutlined />}
      >
        解析预览
      </Button>

      {preview && (
        <div style={{ marginTop: 16 }}>
          <Alert
            message={`共 ${preview.summary.total_rows} 条, 新增 ${preview.summary.new_rows} 条, 重复 ${preview.summary.duplicate_rows} 条`}
            type="info"
            style={{ marginBottom: 12 }}
          />
          {preview.new_students?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span>新学员确认：</span>
              <Checkbox.Group
                options={preview.new_students.map((s: any) => ({
                  label: s.is_duplicate_name ? `⚠ ${s.name} (重名) → 账号: ${s.username}` : `${s.name} → 账号: ${s.username}`,
                  value: s.name,
                }))}
                value={confirmedStudents}
                onChange={(vals) => setConfirmedStudents(vals as string[])}
              />
            </div>
          )}
          <Table
            dataSource={preview.preview.slice(0, 10)}
            columns={[
              { title: '订单ID', dataIndex: 'erp_order_id', width: 100 },
              { title: '学员', dataIndex: 'student_name', width: 80 },
              { title: '总费用', dataIndex: 'total_cost', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
              {
                title: '匹配',
                dataIndex: 'student_match',
                width: 60,
                render: (v: string) =>
                  v === 'matched' ? <Tag color="green">已匹配</Tag> : <Tag color="blue">新学员</Tag>,
              },
            ]}
            rowKey="erp_order_id"
            size="small"
            pagination={false}
          />
          <Button type="primary" onClick={handleConfirm} loading={confirming} block style={{ marginTop: 12 }}>
            确认导入
          </Button>
        </div>
      )}

      <Modal
        title="重复订单处理"
        open={showDupModal}
        onCancel={() => setShowDupModal(false)}
        footer={null}
        width={700}
      >
        {preview?.duplicates?.map((dup: any) => (
          <Card key={dup.erp_order_id} size="small" style={{ marginBottom: 8 }}>
            <p><strong>订单ID: {dup.erp_order_id}</strong> — 差异字段: {dup.diff_fields.join(', ')}</p>
            <Select
              style={{ width: '100%' }}
              placeholder="选择处理方式"
              value={duplicateDecisions[dup.erp_order_id]}
              onChange={(v) => setDuplicateDecisions((prev) => ({ ...prev, [dup.erp_order_id]: v }))}
              options={[
                { value: 'keep_old', label: '保留旧数据' },
                { value: 'replace', label: '替换为新数据' },
                { value: 'merge', label: '智能合并（新数据补充空字段）' },
              ]}
            />
          </Card>
        ))}
        <Button type="primary" block onClick={() => setShowDupModal(false)} style={{ marginTop: 8 }}>
          确认处理
        </Button>
      </Modal>
    </Card>
  );
}

function LogisticsUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadLogistics(file);
      setPreview(res);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const matchedItems = preview.matched.map((m: any) => ({
        order_id: m.order_id,
        weight: m.weight,
        logistics_fee: m.logistics_fee,
        service_fee: m.service_fee,
        packing_fee: m.packing_fee,
      }));
      const res = await confirmLogistics(matchedItems);
      message.success(`更新完成: ${res.updated_rows} 条`);
      setPreview(null);
      setFile(null);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '确认失败');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card title="物流明细上传" bordered={false}>
      <Dragger
        beforeUpload={(f) => { setFile(f); return false; }}
        maxCount={1}
        onRemove={() => { setFile(null); setPreview(null); }}
        accept=".xlsx"
        disabled={loading}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽物流明细文件到此区域</p>
        <p className="ant-upload-hint">支持 .xlsx 格式</p>
      </Dragger>
      <Button
        type="primary"
        onClick={handleUpload}
        loading={loading}
        disabled={!file}
        block
        style={{ marginTop: 12 }}
        icon={<CloudUploadOutlined />}
      >
        解析预览
      </Button>

      {preview && (
        <div style={{ marginTop: 16 }}>
          <Alert
            message={`共 ${preview.summary.total} 条, 匹配 ${preview.summary.matched} 条, 未匹配 ${preview.summary.unmatched} 条`}
            type={preview.summary.unmatched > 0 ? 'warning' : 'success'}
            style={{ marginBottom: 12 }}
          />
          <Table
            dataSource={preview.matched}
            columns={[
              { title: '物流ID', dataIndex: 'logistics_id', width: 100 },
              { title: '订单ID', dataIndex: 'erp_order_id', width: 100 },
              { title: '重量(g)', dataIndex: 'weight', width: 80 },
              { title: '运费', dataIndex: 'logistics_fee', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
              { title: '服务费', dataIndex: 'service_fee', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
              { title: '打包费', dataIndex: 'packing_fee', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
            ]}
            rowKey="logistics_id"
            size="small"
            pagination={false}
          />
          <Button type="primary" onClick={handleConfirm} loading={confirming} block style={{ marginTop: 12 }}>
            确认导入
          </Button>
        </div>
      )}
    </Card>
  );
}