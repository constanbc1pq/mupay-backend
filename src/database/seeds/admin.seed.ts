import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../entities/admin-user.entity';

export async function seedAdmin(dataSource: DataSource) {
  const adminRepository = dataSource.getRepository(AdminUser);

  // Check if admin already exists
  const existingAdmin = await adminRepository.findOne({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = adminRepository.create({
      username: 'admin',
      password: hashedPassword,
      role: 'super_admin',
      status: 'active',
    });

    await adminRepository.save(admin);
    console.log('Admin user created: admin / admin123');
  } else {
    console.log('Admin user already exists');
  }
}
