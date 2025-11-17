import { Controller, Get, Post, Body } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import { Appointment } from "./appointments.entity";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() data: Partial<Appointment>) {
    return this.service.create(data);
  }
}
