import type { Schema } from '../../lib/schema';
import { fakerPT_BR as faker } from '@faker-js/faker';
export const userTable = (table: Schema) => {
  table.string('name');
  table.integer('age');
  table.id();
  table.timestamps();
  // table.uuid('uuid')
};

export const productTable = (table: Schema) => {
  table.integer('user_id');
  table.integer('price');
  table.string('name');
  table.id();
  table.timestamps();
  // table.uuid('uuid')
};

export const complexUserTable = (table: Schema) => {
  table.string('firstName');
  table.string('lastName');
  table.integer('age');
  table.string('email');
  table.string('phoneNumber');
  table.string('address');
  table.string('city');
  table.string('state');
  table.string('zipCode');
  table.string('country');
  // table.date('birthDate');
  table.boolean('isActive');
  table.integer('roleId');
  table.integer('departmentId');
  table.string('username');
  table.string('password');
  // table.timestamp('createdAt');
  // table.timestamp('updatedAt');
  table.id();
  table.timestamps();
  // table.uuid('uuid')
};

function generateComplexUser() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    age: Math.floor(Math.random() * 100),
    email: faker.internet.email(),
    phoneNumber: faker.phone.number(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),
    // birthDate: faker.date.past(),
    isActive: Math.random() > 0.5,
    roleId: Math.floor(Math.random() * 10),
    departmentId: Math.floor(Math.random() * 10),
    username: faker.internet.username(),
    password: faker.internet.password(),
    // createdAt: faker.date.past(),
    // updatedAt: faker.date.past(),
  };
}

export const mock = {
  complexUser: generateComplexUser,
};
